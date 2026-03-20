import express from "express"
import isAuth from "../middlewares/isAuth.js"
import { 
    acceptOrder, 
    getCurrentOrder, 
    getDeliveryBoyAssignment, 
    getMyOrders, 
    getOrderById, 
    placeOrder, 
    sendDeliveryOtp, 
    updateOrderStatus, 
    verifyDeliveryOtp, 
    verifyPayment,
    getTodayDeliveries 
} from "../controllers/order.controllers.js"

const orderRouter = express.Router()

// User Orders
orderRouter.post("/place", isAuth, placeOrder)
orderRouter.post("/verify-payment", isAuth, verifyPayment)
orderRouter.get("/my-orders", isAuth, getMyOrders)
orderRouter.get("/:id", isAuth, getOrderById)

// Order Status (Owner)
orderRouter.put("/status/:orderId/:shopId", isAuth, updateOrderStatus)

// Delivery Boy Assignments
orderRouter.get("/assignments", isAuth, getDeliveryBoyAssignment)
orderRouter.post("/accept/:assignmentId", isAuth, acceptOrder)
orderRouter.get("/current", isAuth, getCurrentOrder)
orderRouter.post("/send-otp", isAuth, sendDeliveryOtp)
orderRouter.post("/verify-otp", isAuth, verifyDeliveryOtp)

// Stats
orderRouter.get('/today-deliveries', isAuth, getTodayDeliveries)

export default orderRouter
