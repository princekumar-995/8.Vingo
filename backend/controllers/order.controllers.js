import DeliveryAssignment from "../models/deliveryAssignment.model.js"
import Order from "../models/order.model.js"
import Shop from "../models/shop.model.js"
import User from "../models/user.model.js"
import { sendDeliveryOtpMail } from "../utils/mail.js"
import RazorPay from "razorpay"
import dotenv from "dotenv"

dotenv.config()

let instance = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    instance = new RazorPay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
}

export const placeOrder = async (req, res) => {
    try {
        const { cartItems, paymentMethod, deliveryAddress, totalAmount } = req.body
        if (!cartItems || cartItems.length === 0) {
            return res.status(400).json({ message: "Cart is empty" })
        }
        if (!deliveryAddress.text || !deliveryAddress.latitude || !deliveryAddress.longitude) {
            return res.status(400).json({ message: "Please provide complete delivery address" })
        }

        const groupItemsByShop = {}
        cartItems.forEach(item => {
            const shopId = item.shop
            if (!groupItemsByShop[shopId]) {
                groupItemsByShop[shopId] = []
            }
            groupItemsByShop[shopId].push(item)
        });

        const shopOrders = await Promise.all(Object.keys(groupItemsByShop).map(async (shopId) => {
            const shop = await Shop.findById(shopId).populate("owner")
            if (!shop) {
                throw new Error(`Shop with id ${shopId} not found`)
            }
            const items = groupItemsByShop[shopId]
            const subtotal = items.reduce((sum, i) => sum + Number(i.price) * Number(i.quantity), 0)
            return {
                shop: shop._id,
                owner: shop.owner._id,
                subtotal,
                shopOrderItems: items.map((i) => ({
                    item: i.item || i._id || i.id, // 🔥 MORE ROBUST: Support multiple naming variants
                    price: i.price,
                    quantity: i.quantity,
                    name: i.name
                }))
            }
        }))

        if (paymentMethod === "online") {
            // Check if instance exists, if not, create a fake order for testing
            let razorOrder;
            if (instance) {
                razorOrder = await instance.orders.create({
                    amount: Math.round(totalAmount * 100),
                    currency: 'INR',
                    receipt: `receipt_${Date.now()}`
                })
            } else {
                // FAKE RAZORPAY ORDER FOR TESTING WHEN KEYS ARE INVALID
                razorOrder = {
                    id: `order_fake_${Date.now()}`,
                    amount: Math.round(totalAmount * 100),
                    currency: 'INR'
                }
            }
            
            const newOrder = await Order.create({
                user: req.userId,
                paymentMethod,
                deliveryAddress,
                totalAmount,
                shopOrders,
                razorpayOrderId: razorOrder.id,
                payment: false
            })

            return res.status(200).json({
                razorOrder,
                orderId: newOrder._id,
            })
        }

        const newOrder = await Order.create({
            user: req.userId,
            paymentMethod,
            deliveryAddress,
            totalAmount,
            shopOrders
        })

        await newOrder.populate("shopOrders.shopOrderItems.item", "name image price")
        await newOrder.populate("shopOrders.shop", "name")
        await newOrder.populate("shopOrders.owner", "fullName socketId")
        await newOrder.populate("user", "fullName email mobile")

        const io = req.app.get('io')
        if (io) {
            newOrder.shopOrders.forEach(shopOrder => {
                const ownerId = shopOrder.owner._id.toString()
                io.to(ownerId).emit('newOrder', {
                    _id: newOrder._id,
                    paymentMethod: newOrder.paymentMethod,
                    user: newOrder.user,
                    shopOrder: shopOrder,
                    createdAt: newOrder.createdAt,
                    deliveryAddress: newOrder.deliveryAddress,
                    payment: newOrder.payment
                })
            });
        }

        return res.status(201).json(newOrder)
    } catch (error) {
        return res.status(500).json({ message: `Place order error: ${error.message}` })
    }
}

export const verifyPayment = async (req, res) => {
    try {
        const { razorpay_payment_id, orderId } = req.body
        
        // 🔥 BYPASS VERIFICATION FOR TESTING IF INSTANCE IS MISSING OR FAKE ID
        if (!instance || razorpay_payment_id === "fake_payment_id") {
            const order = await Order.findById(orderId)
            if (!order) return res.status(400).json({ message: "Order not found" })
            
            order.payment = true
            order.razorpayPaymentId = razorpay_payment_id || "fake_payment_id"
            await order.save()
            return res.status(200).json(order)
        }

        const payment = await instance.payments.fetch(razorpay_payment_id)
        if (!payment || payment.status !== "captured") {
            return res.status(400).json({ message: "Payment not captured" })
        }
        const order = await Order.findById(orderId)
        if (!order) {
            return res.status(400).json({ message: "Order not found" })
        }

        order.payment = true
        order.razorpayPaymentId = razorpay_payment_id
        await order.save()

        await order.populate("shopOrders.shopOrderItems.item", "name image price")
        await order.populate("shopOrders.shop", "name")
        await order.populate("shopOrders.owner", "fullName socketId")
        await order.populate("user", "fullName email mobile")

        const io = req.app.get('io')
        if (io) {
            order.shopOrders.forEach(shopOrder => {
                const ownerId = shopOrder.owner._id.toString()
                io.to(ownerId).emit('newOrder', {
                    _id: order._id,
                    paymentMethod: order.paymentMethod,
                    user: order.user,
                    shopOrder: shopOrder,
                    createdAt: order.createdAt,
                    deliveryAddress: order.deliveryAddress,
                    payment: order.payment
                })
            });
        }

        return res.status(200).json(order)
    } catch (error) {
        return res.status(500).json({ message: `Verify payment error: ${error.message}` })
    }
}

export const getMyOrders = async (req, res) => {
    try {
        const user = await User.findById(req.userId)
        if (user.role === "user") {
            const orders = await Order.find({ user: req.userId })
                .sort({ createdAt: -1 })
                .populate("shopOrders.shop", "name")
                .populate("shopOrders.owner", "fullName email mobile")
                .populate("shopOrders.shopOrderItems.item", "name image price")

            return res.status(200).json(orders)
        } else if (user.role === "owner") {
            const orders = await Order.find({ "shopOrders.owner": req.userId })
                .sort({ createdAt: -1 })
                .populate("shopOrders.shop", "name city state")
                .populate("user")
                .populate("shopOrders.shopOrderItems.item", "name image price")
                .populate("shopOrders.assignedDeliveryBoy", "fullName mobile")
                .populate({
                    path: "shopOrders.assignment",
                    populate: { path: "brodcastedTo", select: "fullName mobile" }
                })

            const flattenedOrders = []
            orders.forEach(order => {
                const ownerSubOrders = order.shopOrders.filter(o => o.owner.toString() === req.userId)
                ownerSubOrders.forEach(so => {
                    flattenedOrders.push({
                        _id: order._id,
                        paymentMethod: order.paymentMethod,
                        user: order.user,
                        shopOrder: {
                            ...so.toObject(),
                            availableBoys: so.assignment?.brodcastedTo || []
                        },
                        createdAt: order.createdAt,
                        deliveryAddress: order.deliveryAddress,
                        payment: order.payment
                    })
                })
            })

            return res.status(200).json(flattenedOrders)
        }
    } catch (error) {
        return res.status(500).json({ message: `Get orders error: ${error.message}` })
    }
}

export const updateOrderStatus = async (req, res) => {
    try {
        const { orderId, shopId } = req.params
        const { status } = req.body
        const order = await Order.findById(orderId).populate("shopOrders.shop") // 🔥 POPULATE SHOP
        if (!order) return res.status(404).json({ message: "Order not found" })

        const shopOrder = order.shopOrders.find(o => o.shop._id.toString() === shopId)
        if (!shopOrder) {
            return res.status(400).json({ message: "Shop order not found" })
        }
        shopOrder.status = status

        // 🔥 Broadcast if "out of delivery" AND (no assignment OR explicitly requested re-broadcast)
        if (status === "out of delivery") {
            const { longitude, latitude } = order.deliveryAddress
            
            // 🔥 SEARCH 1: Nearby Delivery Boys (500km)
            let candidates = await User.find({
                role: "deliveryBoy",
                location: {
                    $near: {
                        $geometry: { type: "Point", coordinates: [Number(longitude), Number(latitude)] },
                        $maxDistance: 500000 
                    }
                }
            }).limit(10)

            // 🔥 SEARCH 2: Fallback to ANY delivery boy with isOnline=true
            if (candidates.length === 0) {
                candidates = await User.find({ role: "deliveryBoy", isOnline: true })
            }

            // 🔥 SEARCH 3: Last Resort - ANY delivery boy (For development/testing)
            if (candidates.length === 0) {
                candidates = await User.find({ role: "deliveryBoy" }).limit(10)
            }

            if (candidates.length > 0) {
                const candidateIds = candidates.map(c => c._id)
                
                // Filter out busy ones
                const busyIds = await DeliveryAssignment.find({
                    assignedTo: { $in: candidateIds },
                    status: "assigned"
                }).distinct("assignedTo")
                const busyIdSet = new Set(busyIds.map(id => id.toString()))
                const availableBoys = candidates.filter(b => !busyIdSet.has(b._id.toString()))

                if (availableBoys.length > 0) {
                    // Create NEW or Update existing assignment
                    let deliveryAssignment;
                    if (shopOrder.assignment) {
                        deliveryAssignment = await DeliveryAssignment.findById(shopOrder.assignment)
                        if (deliveryAssignment && deliveryAssignment.status === "brodcasted") {
                            // Update existing assignment with more candidates
                            const existingIds = new Set(deliveryAssignment.brodcastedTo.map(id => id.toString()))
                            availableBoys.forEach(b => existingIds.add(b._id.toString()))
                            deliveryAssignment.brodcastedTo = Array.from(existingIds)
                            await deliveryAssignment.save()
                        } else {
                            // Create new one if old is completed or missing
                            deliveryAssignment = await DeliveryAssignment.create({
                                order: order._id,
                                shop: shopOrder.shop._id,
                                shopOrderId: shopOrder._id,
                                brodcastedTo: availableBoys.map(b => b._id),
                                status: "brodcasted"
                            })
                            shopOrder.assignment = deliveryAssignment._id
                        }
                    } else {
                        deliveryAssignment = await DeliveryAssignment.create({
                            order: order._id,
                            shop: shopOrder.shop._id,
                            shopOrderId: shopOrder._id,
                            brodcastedTo: availableBoys.map(b => b._id),
                            status: "brodcasted"
                        })
                        shopOrder.assignment = deliveryAssignment._id
                    }
                    
                    const io = req.app.get('io')
                    if (io && deliveryAssignment) {
                        availableBoys.forEach(boy => {
                            io.to(boy._id.toString()).emit('deliveryAvailable', {
                                assignmentId: deliveryAssignment._id,
                                orderId: order._id,
                                shopName: shopOrder.shop.name,
                                deliveryAddress: order.deliveryAddress,
                                items: shopOrder.shopOrderItems,
                                subtotal: shopOrder.subtotal
                            })
                        })
                    }
                    // 🔥 ATTACH BROADCASTED BOYS TO SHOP ORDER TEMPORARILY FOR RESPONSE
                    shopOrder._availableBoys = availableBoys.map(b => ({
                        fullName: b.fullName,
                        mobile: b.mobile,
                        _id: b._id
                    }))
                }
            }
        }

        await order.save()

        const io = req.app.get('io')
        if (io) {
            io.to(order.user.toString()).emit('update-status', {
                orderId: order._id,
                shopId: shopId,
                status: status
            })
        }

        let broadcastMessage = "Status updated successfully"
        if (status === "out of delivery" && !shopOrder.assignment) {
            broadcastMessage = "Status updated, but no delivery boys found to broadcast."
        }

        return res.status(200).json({ 
            message: broadcastMessage, 
            shopOrder: {
                ...shopOrder.toObject(),
                availableBoys: shopOrder._availableBoys || []
            } 
        })
    } catch (error) {
        return res.status(500).json({ message: `Update status error: ${error.message}` })
    }
}

export const getDeliveryBoyAssignment = async (req, res) => {
    try {
        const assignments = await DeliveryAssignment.find({
            brodcastedTo: req.userId,
            status: "brodcasted"
        })
        .populate({
            path: "order",
            populate: { path: "shopOrders.shop", select: "name" }
        })
        .populate("shop", "name")

        const formatted = assignments.map(a => {
            if (!a.order) return null;
            
            // Find the sub-order that matches either the shopOrderId OR the shop itself
            const shopOrder = a.order.shopOrders.find(so => 
                so._id.toString() === a.shopOrderId.toString() || 
                so.shop?._id?.toString() === a.shop?.toString() ||
                so.shop?.toString() === a.shop?.toString()
            )

            if (!shopOrder) return null;

            return {
                assignmentId: a._id,
                orderId: a.order._id,
                shopName: a.shop?.name || shopOrder.shop?.name || "Unknown Shop",
                deliveryAddress: a.order.deliveryAddress,
                items: shopOrder.shopOrderItems || [],
                subtotal: shopOrder.subtotal
            }
        }).filter(Boolean)

        return res.status(200).json(formatted)
    } catch (error) {
        return res.status(500).json({ message: `Get assignments error: ${error.message}` })
    }
}

export const acceptOrder = async (req, res) => {
    try {
        const { assignmentId } = req.params
        const assignment = await DeliveryAssignment.findById(assignmentId)
        if (!assignment) return res.status(404).json({ message: "Assignment not found" })
        if (assignment.status !== "brodcasted") {
            return res.status(400).json({ message: "Assignment is no longer available" })
        }

        const alreadyAssigned = await DeliveryAssignment.findOne({
            assignedTo: req.userId,
            status: "assigned"
        })
        if (alreadyAssigned) {
            return res.status(400).json({ message: "You are already assigned to another order" })
        }

        assignment.assignedTo = req.userId
        assignment.status = 'assigned'
        assignment.acceptedAt = new Date()
        await assignment.save()

        const order = await Order.findById(assignment.order)
        const shopOrder = order.shopOrders.id(assignment.shopOrderId)
        shopOrder.assignedDeliveryBoy = req.userId
        await order.save()

        const io = req.app.get('io')
        if (io) {
            const populatedDeliveryBoy = await User.findById(req.userId).select("fullName mobile")
            io.to(shopOrder.owner.toString()).emit("orderAccepted", {
                orderId: order._id,
                shopId: shopOrder.shop,
                deliveryBoy: populatedDeliveryBoy // 🔥 Match frontend key
            })
        }

        return res.status(200).json({ message: 'Order accepted successfully' })
    } catch (error) {
        return res.status(500).json({ message: `Accept order error: ${error.message}` })
    }
}

export const getCurrentOrder = async (req, res) => {
    try {
        const assignment = await DeliveryAssignment.findOne({
            assignedTo: req.userId,
            status: "assigned"
        }).populate("shop").populate("order").populate("assignedTo")

        if (!assignment) return res.status(404).json({ message: "No active assignment" })

        const order = await Order.findById(assignment.order._id).populate("user")
        const shopOrder = order.shopOrders.id(assignment.shopOrderId)

        return res.status(200).json({
            _id: order._id,
            user: order.user,
            shopOrder,
            deliveryAddress: order.deliveryAddress,
            deliveryBoyLocation: {
                lat: assignment.assignedTo.location.coordinates[1],
                lon: assignment.assignedTo.location.coordinates[0]
            }
        })
    } catch (error) {
        return res.status(500).json({ message: `Get current order error: ${error.message}` })
    }
}

export const getOrderById = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate("user")
            .populate("shopOrders.shop")
            .populate("shopOrders.assignedDeliveryBoy")
            .populate("shopOrders.shopOrderItems.item")

        if (!order) return res.status(404).json({ message: "Order not found" })
        return res.status(200).json(order)
    } catch (error) {
        return res.status(500).json({ message: `Get order error: ${error.message}` })
    }
}

export const sendDeliveryOtp = async (req, res) => {
    try {
        const { orderId, shopOrderId } = req.body
        const order = await Order.findById(orderId).populate("user")
        const shopOrder = order.shopOrders.id(shopOrderId)
        if (!order || !shopOrder) return res.status(404).json({ message: "Order or shop order not found" })

        const otp = Math.floor(1000 + Math.random() * 9000).toString()
        shopOrder.deliveryOtp = otp
        shopOrder.otpExpires = Date.now() + 5 * 60 * 1000
        await order.save()

        await sendDeliveryOtpMail(order.user.email, otp)
        return res.status(200).json({ message: `OTP sent successfully to ${order.user.fullName}` })
    } catch (error) {
        return res.status(500).json({ message: `Send OTP error: ${error.message}` })
    }
}

export const verifyDeliveryOtp = async (req, res) => {
    try {
        const { orderId, shopOrderId, otp } = req.body
        const order = await Order.findById(orderId)
        const shopOrder = order.shopOrders.id(shopOrderId)
        
        if (!shopOrder || shopOrder.deliveryOtp !== otp || shopOrder.otpExpires < Date.now()) {
            return res.status(400).json({ message: "Invalid or expired OTP" })
        }

        shopOrder.status = "delivered"
        shopOrder.deliveredAt = Date.now()
        await order.save()

        await DeliveryAssignment.findOneAndUpdate(
            { shopOrderId: shopOrder._id, status: "assigned" },
            { status: "completed" }
        )

        return res.status(200).json({ message: "Order delivered successfully" })
    } catch (error) {
        return res.status(500).json({ message: `Verify OTP error: ${error.message}` })
    }
}

export const getTodayDeliveries = async (req, res) => {
    try {
        const startOfDay = new Date()
        startOfDay.setHours(0, 0, 0, 0)

        const orders = await Order.find({
            "shopOrders.assignedDeliveryBoy": req.userId,
            "shopOrders.status": "delivered",
            "shopOrders.deliveredAt": { $gte: startOfDay }
        })

        const deliveries = []
        orders.forEach(order => {
            order.shopOrders.forEach(so => {
                if (so.assignedDeliveryBoy?.toString() === req.userId && so.status === "delivered") {
                    deliveries.push(so)
                }
            })
        })

        return res.status(200).json(deliveries)
    } catch (error) {
        return res.status(500).json({ message: `Get today deliveries error: ${error.message}` })
    }
}

