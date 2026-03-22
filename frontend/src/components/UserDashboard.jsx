import React, { useEffect, useRef, useState } from 'react'
import Nav from './Nav'
import { categories } from '../category'
import CategoryCard from './CategoryCard'
import { FaCircleChevronLeft, FaCircleChevronRight, FaStar } from "react-icons/fa6";
import { useSelector } from 'react-redux';
import FoodCard from './FoodCard';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { serverUrl } from '../App';
import TrustSection from './TrustSection';
import Footer from './Footer';
import { motion } from 'framer-motion';

import useGetShopByCity from '../hooks/useGetShopByCity';
import useGetItemsByCity from '../hooks/useGetItemsByCity';
import { ClipLoader } from 'react-spinners';

function UserDashboard() {
  const { currentCity, shopInMyCity, itemsInMyCity, searchItems, userData } = useSelector(state => state.user)
  const { loading: shopsLoading, error: shopsError } = useGetShopByCity()
  const { loading: itemsLoading, error: itemsError } = useGetItemsByCity()
  
  const cateScrollRef = useRef(null)
  const shopScrollRef = useRef(null)
  const navigate=useNavigate()
  const [showLeftCateButton,setShowLeftCateButton]=useState(false)
  const [showRightCateButton,setShowRightCateButton]=useState(false)
   const [showLeftShopButton,setShowLeftShopButton]=useState(false)
  const [showRightShopButton,setShowRightShopButton]=useState(false)
  const [updatedItemsList,setUpdatedItemsList]=useState([])
  const [trendingItems, setTrendingItems] = useState([])
  const [recommendedItems, setRecommendedItems] = useState([])

  // Redirect if not logged in or wrong role (Safety Check)
  useEffect(() => {
    if (!userData) {
      navigate('/signin')
    } else if (userData.role !== 'user') {
      navigate('/')
    }
  }, [userData, navigate])

const handleFilterByCategory=(category)=>{
if(category=="All"){
  setUpdatedItemsList(itemsInMyCity)
}else{
  const filteredList=itemsInMyCity?.filter(i=>i.category===category)
  setUpdatedItemsList(filteredList)
}

}

useEffect(()=>{
setUpdatedItemsList(itemsInMyCity)
if (itemsInMyCity?.length > 0) {
    // Simulate trending and recommended
    setTrendingItems([...itemsInMyCity].sort(() => 0.5 - Math.random()).slice(0, 4))
    setRecommendedItems([...itemsInMyCity].sort(() => 0.5 - Math.random()).slice(0, 4))
}
},[itemsInMyCity])


  const updateButton=(ref,setLeftButton,setRightButton)=>{
const element=ref.current
if(element){
setLeftButton(element.scrollLeft>0)
setRightButton(element.scrollLeft+element.clientWidth<element.scrollWidth)

}
  }
  const scrollHandler=(ref,direction)=>{
    if(ref.current){
      ref.current.scrollBy({
        left:direction=="left"?-200:200,
        behavior:"smooth"
      })
    }
  }




  useEffect(() => {
    const cateElement = cateScrollRef.current
    const shopElement = shopScrollRef.current

    const handleCateScroll = () => updateButton(cateScrollRef, setShowLeftCateButton, setShowRightCateButton)
    const handleShopScroll = () => updateButton(shopScrollRef, setShowLeftShopButton, setShowRightShopButton)

    if (cateElement) {
      updateButton(cateScrollRef, setShowLeftCateButton, setShowRightCateButton)
      cateElement.addEventListener('scroll', handleCateScroll)
    }
    if (shopElement) {
      updateButton(shopScrollRef, setShowLeftShopButton, setShowRightShopButton)
      shopElement.addEventListener('scroll', handleShopScroll)
    }

    return () => {
      cateElement?.removeEventListener("scroll", handleCateScroll)
      shopElement?.removeEventListener("scroll", handleShopScroll)
    }
  }, [categories, shopInMyCity])


  return (
    <div className='w-full min-h-screen bg-[#f8f9fb] flex flex-col items-center gap-[50px] pb-20 overflow-x-hidden'>
      <Nav />

      {searchItems && searchItems.length > 0 && (
        <div className='w-full max-w-6xl flex flex-col gap-5 items-start p-5 bg-white shadow-md rounded-2xl mt-4'>
          <h1 className='text-gray-900 text-2xl sm:text-3xl font-semibold border-b border-gray-200 pb-2'>
            Search Results
          </h1>
          <div className='w-full h-auto flex flex-wrap gap-6 justify-center'>
            {searchItems.map((item) => (
              <FoodCard data={item} key={item._id} />
            ))}
          </div>
        </div>
      )}

      {/* Category Section - White Background */}
      <section className='w-full bg-white py-14 flex flex-col items-center border-b border-gray-100'>
        <div className='w-full max-w-[1200px] px-6 lg:px-20 flex flex-col gap-6'>
          <div className='flex items-center justify-between'>
            <div>
              <h2 className='text-2xl md:text-3xl font-black text-gray-900 tracking-tight uppercase'>Inspiration for your first order</h2>
              <p className='text-gray-400 font-medium text-xs mt-1 capitalize'>Explore our top categories</p>
            </div>
            <div className='flex gap-3'>
              {showLeftCateButton && (
                <button onClick={() => scrollHandler(cateScrollRef, 'left')} className='w-9 h-9 rounded-full bg-white shadow-md flex items-center justify-center border border-gray-100 hover:bg-[#ff4d2d] hover:text-white transition-all'>
                  <FaCircleChevronLeft size={18} />
                </button>
              )}
              <button onClick={() => scrollHandler(cateScrollRef, 'right')} className='w-9 h-9 rounded-full bg-white shadow-md flex items-center justify-center border border-gray-100 hover:bg-[#ff4d2d] hover:text-white transition-all'>
                <FaCircleChevronRight size={18} />
              </button>
            </div>
          </div>
          
          <div ref={cateScrollRef} className='w-full flex gap-5 overflow-x-scroll no-scrollbar py-2'>
            {categories.map((cate, index) => (
              <CategoryCard key={index} name={cate.category} image={cate.image} onClick={() => handleFilterByCategory(cate.category)} />
            ))}
          </div>
        </div>
      </section>

      {/* Best Shops Section - Neutral Background */}
      <section className='w-full py-14 flex flex-col items-center bg-[#f8f9fb]'>
        <div className='w-full max-w-[1200px] px-6 lg:px-20 flex flex-col gap-8'>
          <div className='flex items-center justify-between'>
            <div>
              <h2 className='text-2xl md:text-3xl font-black text-gray-900 tracking-tight uppercase'>Best Shops in {currentCity}</h2>
              <p className='text-gray-400 font-medium text-xs mt-1 capitalize'>Handpicked for you</p>
            </div>
            <div className='flex gap-3'>
              {showLeftShopButton && (
                <button onClick={() => scrollHandler(shopScrollRef, 'left')} className='w-9 h-9 rounded-full bg-white shadow-md flex items-center justify-center border border-gray-100 hover:bg-[#ff4d2d] hover:text-white transition-all'>
                  <FaCircleChevronLeft size={18} />
                </button>
              )}
              <button onClick={() => scrollHandler(shopScrollRef, 'right')} className='w-9 h-9 rounded-full bg-white shadow-md flex items-center justify-center border border-gray-100 hover:bg-[#ff4d2d] hover:text-white transition-all'>
                <FaCircleChevronRight size={18} />
              </button>
            </div>
          </div>

          <div ref={shopScrollRef} className='w-full flex gap-6 overflow-x-scroll no-scrollbar py-4 min-h-[200px] items-center justify-start'>
            {shopsLoading ? (
              <div className='w-full flex flex-col items-center gap-2'>
                <ClipLoader size={30} color='#ff4d2d' />
                <p className='text-xs font-bold text-gray-400 uppercase tracking-widest'>Searching Restaurants...</p>
              </div>
            ) : shopInMyCity && shopInMyCity.length > 0 ? (
              shopInMyCity.map((shop, index) => (
                <motion.div
                  whileHover={{ y: -6, scale: 1.01 }}
                  key={index}
                  onClick={() => navigate(`/shop/${shop._id}`)}
                  className='w-[220px] md:w-[250px] shrink-0 bg-white rounded-2xl overflow-hidden shadow-[0_6px_20px_rgba(0,0,0,0.06)] border border-gray-100 cursor-pointer group transition-all duration-300'
                >
                  <div className='w-full h-36 overflow-hidden relative'>
                    <img src={shop.image} className='w-full h-full object-cover transition-transform duration-700 group-hover:scale-105' alt={shop.name} />
                    <div className='absolute bottom-2 right-2 bg-white/95 backdrop-blur-sm px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest text-gray-800 shadow-sm'>
                      ⏱ 25-30 mins
                    </div>
                  </div>
                  <div className='p-4'>
                    <div className='flex justify-between items-center mb-1'>
                      <h3 className='text-base font-black text-gray-900 truncate group-hover:text-[#ff4d2d] transition-colors uppercase'>{shop.name}</h3>
                      <div className='flex items-center gap-1 bg-green-50 px-1.5 py-0.5 rounded'>
                        <span className='text-[9px] font-black text-green-700'>4.2</span>
                        <FaStar className='text-green-700' size={7} />
                      </div>
                    </div>
                    <p className='text-[9px] text-gray-400 font-semibold uppercase tracking-wider truncate'>{shop.address}</p>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className='flex flex-col items-center gap-3 py-10'>
                <p className='text-lg font-black text-gray-400 uppercase tracking-tighter'>No restaurants found in {currentCity || "this city"} 😔</p>
                <p className='text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]'>Try searching for "Mathura" or "Delhi"</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Trending Section - White Background */}
      <section className='w-full bg-white py-14 flex flex-col items-center border-y border-gray-50'>
        <div className='w-full max-w-[1200px] px-6 lg:px-20 flex flex-col gap-8'>
          <div>
            <h2 className='text-2xl md:text-3xl font-black text-gray-900 tracking-tight uppercase flex items-center gap-2'>
              <span className='text-[#ff4d2d]'>🔥</span> Trending Now
            </h2>
            <p className='text-gray-400 font-medium text-xs mt-1 capitalize'>Most loved items right now</p>
          </div>
          <div className='w-full flex flex-wrap gap-x-6 gap-y-10 justify-center md:justify-start min-h-[300px] items-center'>
            {itemsLoading ? (
              <div className='w-full flex flex-col items-center gap-2'>
                <ClipLoader size={30} color='#ff4d2d' />
                <p className='text-xs font-bold text-gray-400 uppercase tracking-widest'>Curating trending items...</p>
              </div>
            ) : trendingItems && trendingItems.length > 0 ? (
              trendingItems.map((item, index) => (
                <FoodCard key={index} data={item} />
              ))
            ) : (
              <div className='w-full flex flex-col items-center gap-3 py-10'>
                <p className='text-lg font-black text-gray-400 uppercase tracking-tighter'>No trending items in {currentCity} yet</p>
                <p className='text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]'>We'll be here soon!</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Recommended Section - Subtle Highlight */}
      <section className='w-full py-14 flex flex-col items-center bg-[#fdf8f6]'>
        <div className='w-full max-w-[1200px] px-6 lg:px-20 flex flex-col gap-8'>
          <div>
            <h2 className='text-2xl md:text-3xl font-black text-gray-900 tracking-tight uppercase flex items-center gap-2'>
              <span className='text-blue-500'>✨</span> Recommended for You
            </h2>
            <p className='text-gray-400 font-medium text-xs mt-1 capitalize'>Based on your taste</p>
          </div>
          <div className='w-full flex flex-wrap gap-x-6 gap-y-10 justify-center md:justify-start'>
            {recommendedItems?.map((item, index) => (
              <FoodCard key={index} data={item} />
            ))}
          </div>
        </div>
      </section>

      {/* General List - White Background */}
      <section className='w-full bg-white py-14 flex flex-col items-center border-t border-gray-50'>
        <div className='w-full max-w-[1200px] px-6 lg:px-20 flex flex-col gap-8'>
          <div>
            <h2 className='text-2xl md:text-3xl font-black text-gray-900 tracking-tight uppercase'>Suggested for You</h2>
            <p className='text-gray-400 font-medium text-xs mt-1 capitalize'>Discover more delicious options</p>
          </div>
          <div className='w-full flex flex-wrap gap-x-6 gap-y-10 justify-center md:justify-start'>
            {updatedItemsList?.map((item, index) => (
              <FoodCard key={index} data={item} />
            ))}
          </div>
        </div>
      </section>

      <TrustSection />
      <Footer />

    </div>
  )
}

export default UserDashboard
