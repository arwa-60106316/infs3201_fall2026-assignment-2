import dotenv from 'dotenv'
import * as persistence from './persistence.js'

dotenv.config()

/**
 * Helper to get numeric environment configuration variables with fallbacks to 0.
 *
 * @param {String} key Environment variable key name.
 * @returns {Number} Numeric configuration value.
 */
function getEnvNumber(key) {
    const value = process.env[key]
    if (value === undefined || value === null || value === '') {
        return 0
    }
    const parsed = Number(value)
    if (isNaN(parsed)) {
        return 0
    }
    return parsed
}

/**
 * Computes pricing details for an array of order items based on business rules.
 *
 * @param {Array} items Array of order items containing serviceId and quantity.
 * @returns {Promise<Object>} Pricing details object.
 */
export async function calculateOrderPricing(items) {
    let serviceSubtotal = 0
    const detailedItems = []

    for (let i = 0; i < items.length; i = i + 1) {
        const item = items[i]
        const service = await persistence.findService(item.serviceId)
        const unitPrice = service ? service.price : 0
        const lineTotal = unitPrice * item.quantity
        serviceSubtotal = serviceSubtotal + lineTotal

        detailedItems.push({
            serviceId: item.serviceId,
            serviceName: service ? service.name : 'Unknown Service',
            unit: service ? service.unit : '',
            quantity: item.quantity,
            unitPrice: unitPrice,
            lineTotal: lineTotal
        })
    }

    const minChargeEnv = getEnvNumber('MINIMUM_ORDER_CHARGE')
    const freeDeliveryEnv = getEnvNumber('FREE_DELIVERY_THRESHOLD')
    const deliveryChargeEnv = getEnvNumber('DELIVERY_CHARGE')

    let adjustedServiceCharge = serviceSubtotal
    let minOrderAdjustment = 0

    if (serviceSubtotal < minChargeEnv) {
        adjustedServiceCharge = minChargeEnv
        minOrderAdjustment = minChargeEnv - serviceSubtotal
    }

    let deliveryCharge = 0
    if (serviceSubtotal < freeDeliveryEnv) {
        deliveryCharge = deliveryChargeEnv
    }

    const finalTotal = adjustedServiceCharge + deliveryCharge

    return {
        detailedItems: detailedItems,
        serviceSubtotal: serviceSubtotal,
        minOrderAdjustment: minOrderAdjustment,
        adjustedServiceCharge: adjustedServiceCharge,
        deliveryCharge: deliveryCharge,
        finalTotal: finalTotal
    }
}

/**
 * Retrieves all available laundry services (pass-through).
 *
 * @returns {Promise<Array>} List of services.
 */
export async function getServices() {
    return await persistence.getAllServices()
}

/**
 * Validates existence of a service (pass-through).
 *
 * @param {String} serviceId The ID of the service to check.
 * @returns {Promise<Object|null>} Service object if found.
 */
export async function getService(serviceId) {
    return await persistence.findService(serviceId)
}

/**
 * Retrieves customer details and their orders with computed totals.
 *
 * @param {String} customerId ID of the customer.
 * @returns {Promise<Object>} Customer profile and order list with totals.
 */
export async function getCustomerOrders(customerId) {
    const customer = await persistence.findCustomer(customerId)
    if (!customer) {
        return { customer: null, orders: [] }
    }

    const orders = await persistence.findOrdersByCustomer(customerId)
    const summarizedOrders = []

    for (let i = 0; i < orders.length; i = i + 1) {
        const order = orders[i]
        const pricing = await calculateOrderPricing(order.items)
        summarizedOrders.push({
            orderId: order.orderId,
            orderDate: order.orderDate,
            status: order.status,
            total: pricing.finalTotal
        })
    }

    return {
        customer: customer,
        orders: summarizedOrders
    }
}

/**
 * Updates an order's status enforcing progression order:
 * Received -> Washing -> Ready -> Delivered.
 *
 * @param {String} orderId Target order ID.
 * @param {String} newStatus Requested status update.
 * @returns {Promise<Object>} Status update outcome status and message.
 */
export async function updateOrderStatus(orderId, newStatus) {
    const order = await persistence.findOrder(orderId)
    if (!order) {
        return { success: false, reason: 'ORDER_NOT_FOUND' }
    }

    const validStatuses = ['Received', 'Washing', 'Ready', 'Delivered']
    let currentIndex = -1
    let newIndex = -1

    for (let i = 0; i < validStatuses.length; i = i + 1) {
        if (validStatuses[i] === order.status) {
            currentIndex = i
        }
        if (validStatuses[i] === newStatus) {
            newIndex = i
        }
    }

    if (newIndex === -1) {
        return { success: false, reason: 'INVALID_STATUS', currentStatus: order.status }
    }

    if (newIndex <= currentIndex) {
        return { success: false, reason: 'BACKWARD_OR_SAME_STATUS', currentStatus: order.status }
    }

    order.status = newStatus
    await persistence.updateOrder(order)
    return { success: true, currentStatus: order.status }
}

/**
 * Creates a new order for an existing customer.
 *
 * @param {String} customerId Target customer ID.
 * @param {Array} items List of ordered service items.
 * @returns {Promise<Object>} Result object with order ID and computed total.
 */
export async function createNewOrder(customerId, items) {
    const customer = await persistence.findCustomer(customerId)
    if (!customer) {
        return { success: false, reason: 'CUSTOMER_NOT_FOUND' }
    }

    if (!items || items.length === 0) {
        return { success: false, reason: 'NO_ITEMS' }
    }

    const orders = await persistence.getAllOrders()
    let maxNum = 0

    for (let i = 0; i < orders.length; i = i + 1) {
        const idNum = parseInt(orders[i].orderId, 10)
        if (!isNaN(idNum) && idNum > maxNum) {
            maxNum = idNum
        }
    }

    const nextNum = maxNum + 1
    const nextOrderId = String(nextNum).padStart(4, '0')

    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    const currentDateStr = `${year}-${month}-${day}`

    const newOrder = {
        orderId: nextOrderId,
        customerId: customerId,
        orderDate: currentDateStr,
        status: 'Received',
        items: items
    }

    await persistence.createOrder(newOrder)
    const pricing = await calculateOrderPricing(items)

    return {
        success: true,
        orderId: nextOrderId,
        totalPrice: pricing.finalTotal
    }
}

/**
 * Retrieves complete detailed invoice information for an order.
 *
 * @param {String} orderId The ID of the order.
 * @returns {Promise<Object>} Detailed invoice object or failure flag.
 */
export async function getOrderInvoiceDetails(orderId) {
    const order = await persistence.findOrder(orderId)
    if (!order) {
        return { success: false, reason: 'ORDER_NOT_FOUND' }
    }

    const customer = await persistence.findCustomer(order.customerId)
    if (!customer) {
        return { success: false, reason: 'CUSTOMER_NOT_FOUND' }
    }

    const pricing = await calculateOrderPricing(order.items)

    return {
        success: true,
        orderId: order.orderId,
        orderDate: order.orderDate,
        status: order.status,
        customerName: customer.name,
        pricing: pricing
    }
}