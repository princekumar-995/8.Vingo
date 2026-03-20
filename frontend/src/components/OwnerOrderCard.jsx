import axios from 'axios';
import React, { useState, useEffect } from 'react'
import { MdPhone } from "react-icons/md";
import { serverUrl } from '../App';
import { useDispatch, useSelector } from 'react-redux';
import { updateOrderStatus } from '../redux/userSlice';

function OwnerOrderCard({ data }) {
    const [availableBoys, setAvailableBoys] = useState([])
    const dispatch = useDispatch()
    const { socket } = useSelector(state => state.user)

    const handleUpdateStatus = async (orderId, shopId, status) => {
        try {
            const result = await axios.put(`${serverUrl}/api/order/status/${orderId}/${shopId}`, { status }, { withCredentials: true })
            dispatch(updateOrderStatus({ orderId, shopId, status }))
            if (result.data.shopOrder?.availableBoys) {
                setAvailableBoys(result.data.shopOrder.availableBoys)
            }
        } catch (error) {
            console.error("Update status error:", error)
        }
    }

    useEffect(() => {
        if (socket) {
            const handleOrderAccepted = (payload) => {
                if (payload.orderId === data._id && payload.shopId === data.shopOrder.shop._id) {
                    // Refresh or update locally if needed
                    // For now, we rely on the parent to refresh orders or handle via socket
                }
            }
            socket.on("orderAccepted", handleOrderAccepted)
            return () => socket.off("orderAccepted", handleOrderAccepted)
        }
    }, [socket, data._id, data.shopOrder.shop._id])

    return (
        <div className='bg-white rounded-xl shadow-md p-5 space-y-4 border border-gray-100 hover:shadow-lg transition-shadow'>
            <div className='flex justify-between items-start'>
                <div>
                    <h2 className='text-lg font-bold text-gray-800'>{data.user.fullName}</h2>
                    <p className='text-sm text-gray-500'>{data.user.email}</p>
                    <p className='flex items-center gap-2 text-sm text-gray-600 mt-1'>
                        <MdPhone className='text-[#ff4d2d]' />
                        <span>{data.user.mobile}</span>
                    </p>
                </div>
                <div className='text-right'>
                    <p className='text-xs font-semibold text-gray-400 uppercase'>Payment</p>
                    <p className='text-sm font-medium text-gray-700'>
                        {data.paymentMethod === "online" ? (data.payment ? "Paid (Online)" : "Unpaid (Online)") : "Cash on Delivery"}
                    </p>
                </div>
            </div>

            <div className='p-3 bg-gray-50 rounded-lg'>
                <p className='text-sm text-gray-600 font-medium'>Delivery Address:</p>
                <p className='text-sm text-gray-500'>{data.deliveryAddress?.text}</p>
            </div>

            <div className='flex space-x-4 overflow-x-auto pb-2'>
                {data.shopOrder.shopOrderItems.map((item, index) => (
                    <div key={index} className='flex-shrink-0 w-32 border border-gray-100 rounded-lg p-2 bg-white'>
                        <img src={item.item?.image || 'https://via.placeholder.com/150'} alt={item.name} className='w-full h-20 object-cover rounded-md mb-2' />
                        <p className='text-xs font-bold text-gray-800 truncate'>{item.name}</p>
                        <p className='text-[10px] text-gray-500'>Qty: {item.quantity} x ₹{item.price}</p>
                    </div>
                ))}
            </div>

            <div className='flex justify-between items-center pt-3 border-t border-gray-100'>
                <div className='flex items-center gap-2'>
                    <span className='text-sm text-gray-600'>Status:</span>
                    <span className={`text-sm font-bold px-2 py-1 rounded-full uppercase ${
                        data.shopOrder.status === 'delivered' ? 'bg-green-100 text-green-600' : 
                        data.shopOrder.status === 'out of delivery' ? 'bg-blue-100 text-blue-600' :
                        'bg-orange-100 text-orange-600'
                    }`}>
                        {data.shopOrder.status}
                    </span>
                </div>

                {data.shopOrder.status !== 'delivered' && (
                    <select 
                        className='rounded-lg border-2 border-[#ff4d2d] px-3 py-1 text-sm font-semibold text-[#ff4d2d] focus:outline-none focus:ring-2 focus:ring-orange-200'
                        value={data.shopOrder.status}
                        onChange={(e) => handleUpdateStatus(data._id, data.shopOrder.shop._id, e.target.value)}
                    >
                        <option value="pending">Pending</option>
                        <option value="preparing">Preparing</option>
                        <option value="out of delivery">Out For Delivery</option>
                    </select>
                )}
            </div>

            {data.shopOrder.status === "out of delivery" && (
                <div className="mt-3 p-3 border border-orange-100 rounded-lg text-sm bg-orange-50">
                    <p className='font-bold text-orange-800 mb-2'>
                        {data.shopOrder.assignedDeliveryBoy ? "Assigned Delivery Boy:" : 
                         data.shopOrder.assignment ? "Delivery Broadcasted To:" : "Broadcast Failed (No Delivery Boy Found)"}
                    </p>
                    {(!data.shopOrder.assignedDeliveryBoy && !data.shopOrder.assignment) && (
                        <button 
                            onClick={() => handleUpdateStatus(data._id, data.shopOrder.shop._id, "out of delivery")}
                            className='mb-3 bg-[#ff4d2d] text-white px-3 py-1 rounded-md text-xs font-bold hover:bg-orange-600 transition-all'
                        >
                            Try Broadcast Again
                        </button>
                    )}
                    {data.shopOrder.assignedDeliveryBoy ? (
                        <div className='flex items-center justify-between'>
                            <p className='text-gray-700'>{data.shopOrder.assignedDeliveryBoy.fullName}</p>
                            <p className='text-gray-600 flex items-center gap-1'><MdPhone size={14}/> {data.shopOrder.assignedDeliveryBoy.mobile}</p>
                        </div>
                    ) : (availableBoys.length > 0 || data.shopOrder.availableBoys?.length > 0) ? (
                        <div className='space-y-1'>
                            {(availableBoys.length > 0 ? availableBoys : data.shopOrder.availableBoys).map((boy, i) => (
                                <div key={i} className='flex items-center justify-between border-b border-orange-100 last:border-0 pb-1'>
                                    <p className='text-gray-700 font-medium'>{boy.fullName}</p>
                                    <p className='text-gray-500 text-[10px]'>{boy.mobile}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className='text-gray-500 italic'>Waiting for a delivery boy to accept the order...</p>
                    )}
                </div>
            )}

            <div className='flex justify-between items-center pt-2'>
                <span className='text-gray-500 text-xs'>Order ID: ...{data._id.slice(-6)}</span>
                <div className='text-lg font-bold text-gray-900'>
                    Total: ₹{data.shopOrder.subtotal}
                </div>
            </div>
        </div>
    )
}

export default OwnerOrderCard
