// Mutations used only by isolated real-DB regression fixtures, never by production services.
import type { Pool } from '../db/pool.js';

export const assignWarehouse = async (pool: Pool, orderId: number, warehouseId: number) => {
  await pool.query('UPDATE orders SET warehouse_id = ? WHERE id = ?', [warehouseId, orderId]);
};

export const removeSelectedPrice = async (pool: Pool, productId: number, symbol: string) => {
  await pool.query('DELETE FROM product_prices WHERE product_id = ? AND symbol = ?', [
    productId,
    symbol,
  ]);
};

export const zeroSelectedPrice = async (pool: Pool, productId: number, symbol: string) => {
  await pool.query('UPDATE product_prices SET `value` = ? WHERE product_id = ? AND symbol = ?', [
    0,
    productId,
    symbol,
  ]);
};

export const emptyInventory = async (pool: Pool) => {
  await pool.query('DELETE FROM orders');
};

export const attemptWarehouseCoordinates = (pool: Pool, latitude: number, longitude: number) =>
  pool.query(
    'INSERT INTO warehouses (code, name, address, latitude, longitude) VALUES (?, ?, ?, ?, ?)',
    ['INVALID-COORDINATES', 'Invalid coordinates', 'Demo address', latitude, longitude],
  );

export const attemptWarehouseRemoval = (pool: Pool, warehouseId: number) =>
  pool.query('DELETE FROM warehouses WHERE id = ?', [warehouseId]);
