import React from 'react'
import Nav from './Nav'
import { useDispatch, useSelector } from 'react-redux'
import { FaUtensils, FaPlus, FaMapMarkerAlt } from "react-icons/fa";
import { useNavigate } from 'react-router-dom';
import { FaPen } from "react-icons/fa";
import OwnerItemCard from './OwnerItemCard';
import { setActiveShop } from '../redux/ownerSlice';
import Footer from './Footer';

function OwnerDashboard() {
  const { myShops, activeShop } = useSelector(state => state.owner)
  const dispatch = useDispatch()
  const navigate = useNavigate()

  return (
    <div className='w-full min-h-screen bg-[#fff9f6] flex flex-col items-center pb-10'>
      <Nav />
      
      {/* Multi-Shop Selection Bar */}
      {myShops.length > 0 && (
        <div className='w-full max-w-5xl mt-8 px-4 flex overflow-x-auto gap-4 py-2 scrollbar-hide'>
          {myShops.map((shop) => (
            <button
              key={shop._id}
              onClick={() => dispatch(setActiveShop(shop))}
              className={`flex-shrink-0 px-6 py-2 rounded-full font-bold text-sm transition-all ${
                activeShop?._id === shop._id 
                ? 'bg-[#ff4d2d] text-white shadow-lg scale-105' 
                : 'bg-white text-gray-600 border border-gray-200 hover:border-[#ff4d2d]'
              }`}
            >
              {shop.name} ({shop.city})
            </button>
          ))}
          <button 
            onClick={() => {
              dispatch(setActiveShop(null));
              navigate("/create-edit-shop");
            }}
            className='flex-shrink-0 px-6 py-2 rounded-full font-bold text-sm bg-green-500 text-white shadow-md hover:bg-green-600 flex items-center gap-2'
          >
            <FaPlus size={14} /> Add New Shop
          </button>
        </div>
      )}

      {myShops.length === 0 && (
        <div className='flex justify-center items-center p-4 sm:p-6 mt-10'>
          <div className='w-full max-w-md bg-white shadow-lg rounded-2xl p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300'>
            <div className='flex flex-col items-center text-center'>
              <FaUtensils className='text-[#ff4d2d] w-16 h-16 sm:w-20 sm:h-20 mb-4' />
              <h2 className='text-xl sm:text-2xl font-bold text-gray-800 mb-2'>Add Your First Restaurant</h2>
              <p className='text-gray-600 mb-4 text-sm sm:text-base'>Start by adding your first shop. You can later add more shops in different cities.</p>
              <button className='bg-[#ff4d2d] text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-orange-600 transition-all' onClick={() => navigate("/create-edit-shop")}>
                Create Shop
              </button>
            </div>
          </div>
        </div>
      )}

      {activeShop && (
        <div className='w-full flex flex-col items-center gap-6 px-4 sm:px-6'>
          <h1 className='text-2xl sm:text-3xl text-gray-900 flex items-center gap-3 mt-6 text-center font-black'>
            <FaUtensils className='text-[#ff4d2d]' /> Welcome to {activeShop.name}
          </h1>

          <div className='bg-white shadow-2xl rounded-3xl overflow-hidden border border-orange-50 hover:shadow-orange-100 transition-all duration-300 w-full max-w-3xl relative'>
            <div className='absolute top-6 right-6 z-10'>
              <button 
                className='bg-white/90 backdrop-blur-sm text-[#ff4d2d] p-3 rounded-full shadow-xl hover:bg-[#ff4d2d] hover:text-white transition-all'
                onClick={() => navigate("/create-edit-shop")}
                title="Edit Shop Details"
              >
                <FaPen size={20}/>
              </button>
            </div>
            <img src={activeShop.image} alt={activeShop.name} className='w-full h-56 sm:h-72 object-cover'/>
            <div className='p-6 sm:p-8 bg-gradient-to-b from-white to-orange-50/30'>
              <div className='flex justify-between items-start'>
                <div>
                  <h2 className='text-2xl sm:text-3xl font-black text-gray-900 mb-1'>{activeShop.name}</h2>
                  <p className='flex items-center gap-2 text-gray-500 font-bold mb-2 uppercase text-xs tracking-widest'>
                    <FaMapMarkerAlt className='text-[#ff4d2d]' /> {activeShop.city}, {activeShop.state}
                  </p>
                </div>
              </div>
              <p className='text-gray-600 text-sm leading-relaxed border-t border-orange-100 pt-4 mt-2'>{activeShop.address}</p>
            </div>
          </div>

          <div className='w-full max-w-3xl flex justify-between items-center mt-4 px-2'>
            <h3 className='text-xl font-black text-gray-800 uppercase tracking-tighter'>Menu Items</h3>
            <button 
              className='bg-[#ff4d2d] text-white px-4 py-2 rounded-xl font-bold text-sm shadow-md hover:bg-orange-600 transition-all flex items-center gap-2'
              onClick={() => navigate("/add-item")}
            >
              <FaPlus size={14} /> Add Food
            </button>
          </div>

          {activeShop.items.length === 0 ? (
            <div className='w-full max-w-md bg-white shadow-lg rounded-2xl p-8 border border-dashed border-orange-200 text-center'>
              <p className='text-gray-500 font-medium'>No items added yet. Start by adding your delicious menu items!</p>
            </div>
          ) : (
            <div className='flex flex-col items-center gap-4 w-full max-w-3xl'>
              {activeShop.items.map((item, index) => (
                <OwnerItemCard data={item} key={index} />
              ))}
            </div>
          )}
        </div>
      )}
      <Footer />
    </div>
  )
}

export default OwnerDashboard
