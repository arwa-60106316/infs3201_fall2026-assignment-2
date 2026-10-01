import promptSync from 'prompt-sync'
import * as businessLogic from './businessLogic.js'

const prompt = promptSync({ sigint: true })

/**
 * Displays the main console user interface menu.
 */
function displayMenu() {
    console.log('')
    console.log('1. Show laundry services')
    console.log('2. View customer orders')
    console.log('3. Update order status')
    console.log('4. Create new order')
    console.log('5. View invoice')
    console.log('6. Exit')
}

/**
 * Handles Operation 1: Displays all available laundry services in formatted columns.
 *
 * @returns {Promise<void>}
 */
async function handleShowServices() {
    const services = await businessLogic.getServices()
    console.log('')
    console.log('Service ID Service                   Unit     Price   ')
    console.log('---------- ------------------------- -------- --------')

    for (let i = 0; i < services.length; i = i + 1) {
        const service = services[i]
        const idCol = service.serviceId.padEnd(10, ' ')
        const nameCol = service.name.padEnd(25, ' ')
        const unitCol = service.unit.padEnd(8, ' ')
        const priceCol = service.price.toFixed(2).padStart(8, ' ')
        console.log(`${idCol} ${nameCol} ${unitCol} ${priceCol}`)
    }
}

/**
 * Handles Operation 2: Displays orders associated with a customer ID.
 *
 * @returns {Promise<void>}
 */
async function handleViewCustomerOrders() {
    const customerId = prompt('Enter customer ID: ').trim()
    const result = await businessLogic.getCustomerOrders(customerId)

    if (!result.customer) {
        console.log('Customer not found')
        return
    }

    console.log(`Orders for ${result.customer.name}`)
    console.log('Order ID   Order Date Status     Total   ')
    console.log('---------- ---------- ---------- --------')

    for (let i = 0; i < result.orders.length; i = i + 1) {
        const order = result.orders[i]
        const idCol = order.orderId.padEnd(10, ' ')
        const dateCol = order.orderDate.padEnd(10, ' ')
        const statusCol = order.status.padEnd(10, ' ')
        const totalCol = order.total.toFixed(2).padStart(8, ' ')
        console.log(`${idCol} ${dateCol} ${statusCol} ${totalCol}`)
    }
}

/**
 * Handles Operation 3: Prompts user to update the status of an existing order.
 *
 * @returns {Promise<void>}
 */
async function handleUpdateOrderStatus() {
    const orderId = prompt('Enter order ID: ').trim()
    const newStatus = prompt('Enter new status: ').trim()

    const result = await businessLogic.updateOrderStatus(orderId, newStatus)

    if (result.success) {
        console.log('Order status updated')
    } else if (result.reason === 'ORDER_NOT_FOUND') {
        console.log('Order not found')
    } else {
        console.log('New status not accepted')
    }
}

/**
 * Handles Operation 4: Collects services and creates a new order for a customer.
 *
 * @returns {Promise<void>}
 */
async function handleCreateNewOrder() {
    const customerId = prompt('Enter customer ID: ').trim()

    const items = []
    let adding = true

    while (adding) {
        const serviceId = prompt('Enter service ID (blank to finish): ').trim()
        if (serviceId === '') {
            adding = false;
            break
        }

        const service = await businessLogic.getService(serviceId)
        if (!service) {
            console.log('Service ID does not exist. Please try again.')
            continue
        }

        const quantityInput = prompt('Enter quantity: ').trim()
        const quantity = parseFloat(quantityInput)

        if (isNaN(quantity) || quantity <= 0) {
            console.log('Invalid quantity. Service not added.')
            continue
        }

        items.push({
            serviceId: serviceId,
            quantity: quantity
        })
    }

    const result = await businessLogic.createNewOrder(customerId, items)

    if (!result.success) {
        if (result.reason === 'CUSTOMER_NOT_FOUND') {
            console.log('Customer not found')
        } else if (result.reason === 'NO_ITEMS') {
            console.log('Order cancelled: No items added')
        }
        return
    }

    console.log(`Order ${result.orderId} created`)
    console.log(`Total price: ${result.totalPrice.toFixed(2)} QAR`)
}

/**
 * Handles Operation 5: Displays detailed invoice for a given order ID.
 *
 * @returns {Promise<void>}
 */
async function handleViewInvoice() {
    const orderId = prompt('Enter order ID: ').trim()
    const result = await businessLogic.getOrderInvoiceDetails(orderId)

    if (!result.success) {
        console.log('Order or required reference details not found')
        return
    }

    const pricing = result.pricing

    console.log(`Order: ${result.orderId}`)
    console.log(`Date: ${result.orderDate}`)
    console.log(`Status: ${result.status}`)
    console.log(`Customer: ${result.customerName}`)
    console.log('')
    console.log('Service                   Qty      Price    Line Total')
    console.log('------------------------- -------- -------- ----------')

    for (let i = 0; i < pricing.detailedItems.length; i = i + 1) {
        const item = pricing.detailedItems[i]
        const nameCol = item.serviceName.padEnd(25, ' ')
        const qtyCol = String(item.quantity).padStart(8, ' ')
        const priceCol = item.unitPrice.toFixed(2).padStart(8, ' ')
        const lineTotalCol = item.lineTotal.toFixed(2).padStart(10, ' ')
        console.log(`${nameCol} ${qtyCol} ${priceCol} ${lineTotalCol}`)
    }

    console.log('')
    console.log(`Service subtotal:                               ${pricing.serviceSubtotal.toFixed(2)}`)
    console.log(`Minimum-order adjustment:                       ${pricing.minOrderAdjustment.toFixed(2)}`)
    console.log(`Delivery charge:                                ${pricing.deliveryCharge.toFixed(2)}`)
    console.log(`Final total:                                    ${pricing.finalTotal.toFixed(2)} QAR`)
}

/**
 * Main application execution loop.
 *
 * @returns {Promise<void>}
 */
async function main() {
    let running = true

    while (running) {
        displayMenu()
        const choice = prompt('What is your choice> ').trim()

        if (choice === '1') {
            await handleShowServices()
        } else if (choice === '2') {
            await handleViewCustomerOrders()
        } else if (choice === '3') {
            await handleUpdateOrderStatus()
        } else if (choice === '4') {
            await handleCreateNewOrder()
        } else if (choice === '5') {
            await handleViewInvoice()
        } else if (choice === '6') {
            running = false
        } else {
            console.log('Invalid choice. Please select an option between 1 and 6.')
        }
    }
}

main().catch(function (error) {
    console.error('An unexpected error occurred:', error)
})