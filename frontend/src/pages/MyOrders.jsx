import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { IoIosArrowRoundBack } from "react-icons/io";
import { useNavigate } from 'react-router-dom';
import UserOrderCard from '../components/UserOrderCard';
import OwnerOrderCard from '../components/OwnerOrderCard';
import { setMyOrders, updateOrderStatus, updateRealtimeOrderStatus } from '../redux/userSlice';


function MyOrders() {
  const { userData, myOrders,socket} = useSelector(state => state.user)
  const { activeShop } = useSelector(state => state.owner)
  const navigate = useNavigate()
  const dispatch=useDispatch()

  const filteredOrders = (userData?.role === 'owner' && activeShop)
    ? myOrders.filter(order => order.shopOrder?.shop?._id === activeShop._id)
    : myOrders;

  useEffect(()=>{
socket?.on('newOrder',(data)=>{
  // Check if the incoming order belongs to ANY of the owner's shops
  // For simplicity, we just add it to the general list
  if (Array.isArray(myOrders)) {
    dispatch(setMyOrders([data,...myOrders]))
  }
})

socket?.on('update-status',({orderId,shopId,status,userId})=>{
if(userId==userData._id){
  dispatch(updateRealtimeOrderStatus({orderId,shopId,status}))
}
})

socket?.on('orderAccepted', ({ orderId, shopId, deliveryBoy }) => {
  if (userData.role === 'owner') {
    // Update the specific order in state with the assigned delivery boy
    const updatedOrders = myOrders.map(order => {
      if (order._id === orderId && order.shopOrder.shop._id === shopId) {
        return {
          ...order,
          shopOrder: {
            ...order.shopOrder,
            assignedDeliveryBoy: deliveryBoy
          }
        }
      }
      return order
    })
    dispatch(setMyOrders(updatedOrders))
  }
})

return ()=>{
  socket?.off('newOrder')
  socket?.off('update-status')
  socket?.off('orderAccepted')
}
  },[socket, myOrders, userData._id, dispatch])



  
  return (
    <div className='w-full min-h-screen bg-[#fff9f6] flex justify-center px-4'>
      <div className='w-full max-w-[800px] p-4'>

        <div className='flex items-center gap-[20px] mb-6 '>
          <div className=' z-[10] ' onClick={() => navigate("/")}>
            <IoIosArrowRoundBack size={35} className='text-[#ff4d2d]' />
          </div>
          <h1 className='text-2xl font-bold  text-start'>My Orders</h1>
        </div>
        <div className='space-y-6'>
          {filteredOrders?.length === 0 && (
            <div className='text-center py-20 bg-white rounded-3xl shadow-sm border border-orange-50'>
              <p className='text-gray-400 font-medium italic'>No orders found {userData.role === 'owner' ? `for ${activeShop?.name}` : ''}</p>
            </div>
          )}
          {filteredOrders?.map((order,index)=>(
            userData.role=="user" ?
            (
              <UserOrderCard data={order} key={index}/>
            )
            :
            userData.role=="owner"? (
              <OwnerOrderCard data={order} key={index}/>
            )
            :
            null
          ))}
        </div>
      </div>
    </div>
  )
}

export default MyOrders
