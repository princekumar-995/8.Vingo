// import User from "./models/user.model.js"

// export const socketHandler = (io) => {
//   io.on('connection', (socket) => {
//     console.log(socket.id)
//     socket.on('identity', async ({ userId }) => {
//       try {
//         const user = await User.findByIdAndUpdate(userId, {
//           socketId: socket.id, isOnline: true
//         }, { new: true })
//       } catch (error) {
//         console.log(error)
//       }
//     })


//     socket.on('updateLocation', async ({ latitude, longitude, userId }) => {
//       try {
//         const user = await User.findByIdAndUpdate(userId, {
//           location: {
//             type: 'Point',
//             coordinates: [longitude, latitude]
//           },
//           isOnline: true,
//           socketId: socket.id
//         })

//         if (user) {
//           io.emit('updateDeliveryLocation',{
//             deliveryBoyId:userId,
//             latitude,
//             longitude
//           })
//         }


//       } catch (error) {
//           console.log('updateDeliveryLocation error')
//       }
//     })




//     socket.on('disconnect', async () => {
//       try {

//         await User.findOneAndUpdate({ socketId: socket.id }, {
//           socketId: null,
//           isOnline: false
//         })
//       } catch (error) {
//         console.log(error)
//       }

//     })
//   })
// }



import User from "./models/user.model.js"

export const socketHandler = (io) => {
  io.on('connection', (socket) => {

    console.log("Connected:",socket.id)

    // 🔥 USER CONNECT
    socket.on('identity', async ({ userId }) => {
      try {
        socket.join(userId)

        await User.findByIdAndUpdate(userId, {
          socketId: socket.id,
          isOnline: true
        })
      } catch (error) {
        console.log(error)
      }
    })

    // 🔥 LOCATION UPDATE
    socket.on('updateLocation', async ({ latitude, longitude, userId }) => {
      try {
        const user = await User.findByIdAndUpdate(userId, {
          location: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          isOnline: true,
          socketId: socket.id
        })

        if (user) {
          io.emit('updateDeliveryLocation',{
            deliveryBoyId:userId,
            latitude,
            longitude
          })
        }

      } catch (error) {
        console.log('updateDeliveryLocation error')
      }
    })

    // 🔥 NEW ORDER → OWNER
    socket.on("newOrder",(data)=>{
      const {ownerId, order} = data
      io.to(ownerId).emit("newOrderReceived",order)
    })

    // 🔥 OWNER → DELIVERY BOYS
    socket.on("orderOutForDelivery",(order)=>{
      io.emit("deliveryAvailable",order)
    })

    // 🔥 DELIVERY BOY ACCEPT
    socket.on("acceptDelivery",({order,userId})=>{
      io.to(order.user.toString()).emit("deliveryAssigned",{
        order,
        deliveryBoy:userId
      })
    })

    // 🔥 DISCONNECT
    socket.on('disconnect', async () => {
      try {
        await User.findOneAndUpdate({ socketId: socket.id }, {
          socketId: null,
          isOnline: false
        })
      } catch (error) {
        console.log(error)
      }
    })

  })
}