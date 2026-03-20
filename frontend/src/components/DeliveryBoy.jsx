import React, { useState, useEffect } from 'react'
import Nav from './Nav'
import { useSelector } from 'react-redux'
import axios from 'axios'
import { serverUrl } from '../App'
import DeliveryBoyTracking from './DeliveryBoyTracking'
import { ClipLoader } from 'react-spinners'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

function DeliveryBoy() {
    const { userData, socket } = useSelector(state => state.user)
    const [currentOrder, setCurrentOrder] = useState(null)
    const [availableAssignments, setAvailableAssignments] = useState([])
    const [showOtpBox, setShowOtpBox] = useState(false)
    const [otp, setOtp] = useState("")
    const [todayDeliveries, setTodayDeliveries] = useState([])
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState("")
    const [liveLocation, setLiveLocation] = useState(userData?.location?.coordinates || [0, 0]) // 🔥 Local live location

    const fetchInitialData = async () => {
        setLoading(true)
        try {
            // Fetch assignments
            const assignmentsRes = await axios.get(`${serverUrl}/api/order/assignments`, { withCredentials: true }).catch(err => ({ data: [] }))
            
            // 🔥 DUMMY DATA ADDED FOR TESTING
            const dummyRequest = {
                assignmentId: "dummy_123",
                orderId: "dummy_order_123",
                shopName: "Pizza Hut (Dummy)",
                deliveryAddress: {
                    text: "GLA University, Mathura",
                    latitude: 27.6057,
                    longitude: 77.5933
                },
                items: [{ name: "Cheese Pizza", quantity: 1, price: 350 }],
                subtotal: 350,
                isDummy: true
            };

            setAvailableAssignments(assignmentsRes.data.length > 0 ? assignmentsRes.data : [dummyRequest])

            // Fetch current order
            const currentOrderRes = await axios.get(`${serverUrl}/api/order/current`, { withCredentials: true }).catch(err => ({ data: null }))
            setCurrentOrder(currentOrderRes.data)

            // Fetch today deliveries
            const deliveriesRes = await axios.get(`${serverUrl}/api/order/today-deliveries`, { withCredentials: true }).catch(err => ({ data: [] }))
            setTodayDeliveries(deliveriesRes.data)
        } catch (error) {
            console.error("Fetch initial data error:", error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (userData?.role === "deliveryBoy") {
            fetchInitialData()
        }
    }, [userData])

    useEffect(() => {
        if (!socket || userData.role !== "deliveryBoy") return

        const handleNewAssignment = (data) => {
            // Check if this assignment is already in the list
            setAvailableAssignments(prev => {
                const exists = prev.some(a => a.assignmentId === data.assignmentId)
                if (exists) return prev
                return [data, ...prev]
            })
        }

        socket.on('deliveryAvailable', handleNewAssignment)

        let watchId
        if (navigator.geolocation) {
            watchId = navigator.geolocation.watchPosition((position) => {
                const { latitude, longitude } = position.coords
                setLiveLocation([longitude, latitude]) // 🔥 Update local state
                socket.emit('updateLocation', {
                    latitude,
                    longitude,
                    userId: userData._id
                })
            }, (error) => console.error(error), { enableHighAccuracy: true })
        }

        return () => {
            socket.off('deliveryAvailable', handleNewAssignment)
            if (watchId) navigator.geolocation.clearWatch(watchId)
        }
    }, [socket, userData])

    const handleAccept = async (assignmentId, isDummy = false) => {
        if (isDummy) {
            setCurrentOrder({
                _id: "dummy_order_123",
                user: { fullName: "Dummy User", mobile: "9876543210" },
                shopOrder: {
                    _id: "dummy_shop_order_123",
                    shopOrderItems: [{ name: "Cheese Pizza", quantity: 1, price: 350 }],
                    subtotal: 350,
                    status: "out of delivery"
                },
                deliveryAddress: {
                    text: "GLA University, Mathura",
                    latitude: 27.6057,
                    longitude: 77.5933
                },
                isDummy: true
            });
            setAvailableAssignments([]);
            return;
        }
        try {
            await axios.post(`${serverUrl}/api/order/accept/${assignmentId}`, {}, { withCredentials: true })
            setAvailableAssignments(prev => prev.filter(a => a.assignmentId !== assignmentId))
            const res = await axios.get(`${serverUrl}/api/order/current`, { withCredentials: true })
            setCurrentOrder(res.data)
        } catch (error) {
            alert(error.response?.data?.message || "Error accepting order")
        }
    }

    const handleSendOtp = async () => {
        try {
            setMessage("Sending OTP...")
            await axios.post(`${serverUrl}/api/order/send-otp`, {
                orderId: currentOrder._id,
                shopOrderId: currentOrder.shopOrder._id
            }, { withCredentials: true })
            setShowOtpBox(true)
            setMessage("OTP sent to customer's email!")
        } catch (error) {
            setMessage("Error sending OTP")
        }
    }

    const handleVerifyOtp = async () => {
        if (currentOrder?.isDummy) {
            if (otp === "1234") {
                setCurrentOrder(null);
                setShowOtpBox(false);
                setOtp("");
                setMessage("Dummy Order Delivered Successfully! (OTP: 1234)");
                return;
            } else {
                alert("Invalid Dummy OTP. Use 1234");
                return;
            }
        }
        try {
            await axios.post(`${serverUrl}/api/order/verify-otp`, {
                orderId: currentOrder._id,
                shopOrderId: currentOrder.shopOrder._id,
                otp
            }, { withCredentials: true })
            setCurrentOrder(null)
            setShowOtpBox(false)
            setOtp("")
            setMessage("Order delivered successfully!")
            fetchInitialData()
        } catch (error) {
            alert(error.response?.data?.message || "Invalid OTP")
        }
    }

    if (loading) return <div className='h-screen flex items-center justify-center'><ClipLoader color="#ff4d2d" /></div>

    return (
        <div className='w-full min-h-screen bg-[#fff9f6] flex flex-col items-center p-4'>
            <Nav />
            <div className='w-full max-w-4xl mt-20'>
                {message && <div className='bg-orange-100 text-orange-700 p-3 rounded-lg mb-4 text-center font-medium'>{message}</div>}

                {currentOrder ? (
                    <div className='bg-white rounded-2xl shadow-xl p-6 border border-orange-100'>
                        <h2 className='text-2xl font-bold text-gray-800 mb-4 border-b pb-2'>Active Delivery</h2>
                        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                            <div>
                                <p className='text-sm text-gray-500 uppercase font-bold'>Customer</p>
                                <p className='text-lg font-medium'>{currentOrder.user.fullName}</p>
                                <p className='text-gray-600'>{currentOrder.user.mobile}</p>
                                <p className='mt-3 text-sm text-gray-500 uppercase font-bold'>Address</p>
                                <p className='text-gray-700'>{currentOrder.deliveryAddress.text}</p>
                            </div>
                            <div className='bg-gray-50 p-4 rounded-xl'>
                                <p className='text-sm text-gray-500 uppercase font-bold mb-2'>Order Items</p>
                                {currentOrder.shopOrder.shopOrderItems.map((item, idx) => (
                                    <div key={idx} className='flex justify-between text-sm py-1 border-b border-gray-200 last:border-0'>
                                        <span>{item.name} x {item.quantity}</span>
                                        <span className='font-medium'>₹{item.price * item.quantity}</span>
                                    </div>
                                ))}
                                <div className='mt-3 pt-2 border-t border-gray-300 flex justify-between font-bold'>
                                    <span>Total Amount</span>
                                    <span className='text-[#ff4d2d]'>₹{currentOrder.shopOrder.subtotal}</span>
                                </div>
                            </div>
                        </div>

                        <div className='mt-8 flex flex-col gap-4'>
                            {!showOtpBox ? (
                                <button 
                                    onClick={handleSendOtp}
                                    className='w-full bg-[#ff4d2d] text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-orange-600 transition-all'
                                >
                                    Arrived at Customer (Send OTP)
                                </button>
                            ) : (
                                <div className='flex flex-col gap-3'>
                                    <input 
                                        type="text" 
                                        placeholder="Enter 4-digit OTP" 
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                        className='w-full p-4 border-2 border-orange-200 rounded-xl text-center text-2xl tracking-widest focus:border-[#ff4d2d] outline-none'
                                    />
                                    <button 
                                        onClick={handleVerifyOtp}
                                        className='w-full bg-green-500 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-green-600 transition-all'
                                    >
                                        Verify & Mark Delivered
                                    </button>
                                </div>
                            )}
                        </div>
                        
                        <div className='mt-6 h-64 rounded-xl overflow-hidden border border-gray-200'>
                            <DeliveryBoyTracking 
                                deliveryBoyLocation={liveLocation}
                                customerLocation={[currentOrder.deliveryAddress.longitude, currentOrder.deliveryAddress.latitude]}
                            />
                        </div>
                    </div>
                ) : (
                    <div className='space-y-6'>
                        <div className='bg-white p-6 rounded-2xl shadow-lg border border-gray-100'>
                            <h2 className='text-xl font-bold text-gray-800 mb-4'>Available Requests ({availableAssignments.length})</h2>
                            {availableAssignments.length === 0 ? (
                                <div className='text-center py-10'>
                                    <p className='text-gray-400 italic'>No delivery requests nearby...</p>
                                </div>
                            ) : (
                                <div className='grid gap-4'>
                                    {availableAssignments.map((a, idx) => (
                                        <div key={idx} className='border border-orange-100 p-4 rounded-xl bg-orange-50/30 flex justify-between items-center'>
                                            <div>
                                                <p className='font-bold text-gray-800'>{a.shopName}</p>
                                                <p className='text-sm text-gray-500 truncate max-w-xs'>{a.deliveryAddress.text}</p>
                                                <p className='text-sm font-bold text-[#ff4d2d]'>Earnings: ₹50</p>
                                            </div>
                                            <button 
                                                onClick={() => handleAccept(a.assignmentId, a.isDummy)}
                                                className='bg-[#ff4d2d] text-white px-6 py-2 rounded-lg font-bold hover:bg-orange-600 transition-all'
                                            >
                                                Accept
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className='bg-white p-6 rounded-2xl shadow-lg border border-gray-100'>
                            <h2 className='text-xl font-bold text-gray-800 mb-4'>Today's Earnings</h2>
                            <div className='flex items-center justify-between p-4 bg-green-50 rounded-xl border border-green-100'>
                                <div>
                                    <p className='text-sm text-green-600 font-bold uppercase'>Deliveries</p>
                                    <p className='text-3xl font-black text-green-800'>{todayDeliveries.length}</p>
                                </div>
                                <div className='text-right'>
                                    <p className='text-sm text-green-600 font-bold uppercase'>Total Earned</p>
                                    <p className='text-3xl font-black text-green-800'>₹{todayDeliveries.length * 50}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default DeliveryBoy
