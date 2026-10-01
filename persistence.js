import fs from 'fs/promises'

/**
 * Reads and parses a JSON file asynchronously.
 *
 * @param {String} filePath The path to the JSON file.
 * @returns {Promise<Array>} Resolves to the parsed array of objects.
 */
async function readJsonFile(filePath) {
    const data = await fs.readFile(filePath, 'utf8')
    return JSON.parse(data)
}

/**
 * Writes data to a JSON file asynchronously.
 *
 * @param {String} filePath The path to the JSON file.
 * @param {Array} data The data array to write.
 * @returns {Promise<void>}
 */
async function writeJsonFile(filePath, data) {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8')
}

/**
 * Retrieves all laundry services.
 *
 * @returns {Promise<Array>} Array of service objects.
 */
export async function getAllServices() {
    return await readJsonFile('./services.json')
}

/**
 * Finds a service by its ID.
 *
 * @param {String} serviceId The ID of the service to find.
 * @returns {Promise<Object|null>} Service object if found, otherwise null.
 */
export async function findService(serviceId) {
    const services = await getAllServices()
    for (let i = 0; i < services.length; i = i + 1) {
        if (services[i].serviceId === serviceId) {
            return services[i]
        }
    }
    return null
}

/**
 * Retrieves all customers.
 *
 * @returns {Promise<Array>} Array of customer objects.
 */
export async function getAllCustomers() {
    return await readJsonFile('./customers.json')
}

/**
 * Finds a customer by their customer ID.
 *
 * @param {String} customerId The ID of the customer to find.
 * @returns {Promise<Object|null>} Customer object if found, otherwise null.
 */
export async function findCustomer(customerId) {
    const customers = await getAllCustomers()
    for (let i = 0; i < customers.length; i = i + 1) {
        if (customers[i].customerId === customerId) {
            return customers[i]
        }
    }
    return null
}

/**
 * Retrieves all orders.
 *
 * @returns {Promise<Array>} Array of order objects.
 */
export async function getAllOrders() {
    return await readJsonFile('./orders.json')
}

/**
 * Finds an order by its order ID.
 *
 * @param {String} orderId The ID of the order to find.
 * @returns {Promise<Object|null>} Order object if found, otherwise null.
 */
export async function findOrder(orderId) {
    const orders = await getAllOrders()
    for (let i = 0; i < orders.length; i = i + 1) {
        if (orders[i].orderId === orderId) {
            return orders[i]
        }
    }
    return null
}

/**
 * Finds all orders associated with a given customer ID.
 *
 * @param {String} customerId The customer ID to search orders for.
 * @returns {Promise<Array>} Array of order objects for the customer.
 */
export async function findOrdersByCustomer(customerId) {
    const orders = await getAllOrders()
    const customerOrders = []
    for (let i = 0; i < orders.length; i = i + 1) {
        if (orders[i].customerId === customerId) {
            customerOrders.push(orders[i])
        }
    }
    return customerOrders
}

/**
 * Appends a new order to the storage file.
 *
 * @param {Object} newOrder The order object to create.
 * @returns {Promise<void>}
 */
export async function createOrder(newOrder) {
    const orders = await getAllOrders()
    orders.push(newOrder)
    await writeJsonFile('./orders.json', orders)
}

/**
 * Updates an existing order in the storage file.
 *
 * @param {Object} updatedOrder The updated order object.
 * @returns {Promise<void>}
 */
export async function updateOrder(updatedOrder) {
    const orders = await getAllOrders()
    for (let i = 0; i < orders.length; i = i + 1) {
        if (orders[i].orderId === updatedOrder.orderId) {
            orders[i] = updatedOrder
            break
        }
    }
    await writeJsonFile('./orders.json', orders)
}