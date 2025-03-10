import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { APIRoute } from 'astro';

// Configuration - Replace with your actual Shopify credentials
const SHOPIFY_DOMAIN = "your-store.myshopify.com";
const SHOPIFY_API_KEY = "your-api-key";
const SHOPIFY_API_SECRET = "your-api-secret";
const SHOPIFY_ACCESS_TOKEN = "your-access-token";

// Cache time in seconds (1 hour)
const CACHE_TIME = 3600;

// Create a Hono app
const app = new Hono();

// Apply CORS middleware
app.use('*', cors({
  origin: '*',
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  exposeHeaders: ['Content-Length'],
  maxAge: 86400,
}));

// API Info route
app.get('/', (c) => {
  return c.json({
    status: 'success',
    message: 'Shopify API Worker',
    endpoints: ['/api/products', '/api/cart', '/api/orders'],
    path: c.req.path
  });
});

// Products routes
app.get('/api/products', async (c) => {
  const url = new URL(c.req.url);
  const limit = url.searchParams.get('limit') || '10';
  const page = url.searchParams.get('page') || '1';
  
  const products = await fetchShopifyProducts(parseInt(limit), parseInt(page));
  
  return c.json({
    status: 'success',
    products,
    pagination: {
      current_page: parseInt(page),
      limit: parseInt(limit),
      total_pages: 10, // Mock value
      has_next: parseInt(page) < 10 // Mock value
    }
  }, 200, {
    'Cache-Control': `public, max-age=${CACHE_TIME}`
  });
});

app.get('/api/products/:id', async (c) => {
  const productId = c.req.param('id');
  const product = await fetchShopifyProduct(productId);
  
  return c.json({
    status: 'success',
    product
  }, 200, {
    'Cache-Control': `public, max-age=${CACHE_TIME}`
  });
});

// Cart routes
app.get('/api/cart', (c) => {
  return c.json({
    status: 'success',
    message: 'Cart retrieval would happen here',
    cart_items: []
  });
});

app.post('/api/cart', async (c) => {
  const cartData = await c.req.json();
  return c.json({
    status: 'success',
    message: 'Item added to cart',
    added_item: cartData
  }, 201);
});

app.put('/api/cart', (c) => {
  return c.json({
    status: 'success',
    message: 'Cart updated successfully'
  });
});

app.delete('/api/cart', (c) => {
  return c.json({
    status: 'success',
    message: 'Cart item removed'
  });
});

// Orders routes
app.get('/api/orders', (c) => {
  return c.json({
    status: 'success',
    message: 'Orders list',
    orders: []
  });
});

app.get('/api/orders/:id', (c) => {
  const orderId = c.req.param('id');
  
  return c.json({
    status: 'success',
    message: 'Order details',
    order_id: orderId,
    order_status: 'processing'
  });
});

app.post('/api/orders', async (c) => {
  const orderData = await c.req.json();
  return c.json({
    status: 'success',
    message: 'Order created successfully',
    order_id: 'ord_' + Date.now(),
    order_data: orderData
  }, 201);
});

// Error handling middleware
app.onError((err, c) => {
  console.error(`Error: ${err.message}`);
  return c.json({
    status: 'error',
    message: err.message || 'An error occurred',
    path: c.req.path
  }, 500);
});

/**
 * Helper functions for Shopify API interaction
 */

/**
 * Fetch products from Shopify API
 */
async function fetchShopifyProducts(limit = 10, page = 1) {
  // This would normally fetch from Shopify GraphQL API
  // For demonstration, we're returning mock data
  
  return Array.from({ length: limit }, (_, i) => ({
    id: `prod_${(page - 1) * limit + i + 1}`,
    title: `Product ${(page - 1) * limit + i + 1}`,
    price: (Math.random() * 100 + 10).toFixed(2),
    description: `This is a sample product ${(page - 1) * limit + i + 1}`,
    image: "https://placekitten.com/200/300",
    variants: []
  }));
}

/**
 * Fetch single product from Shopify API
 */
async function fetchShopifyProduct(productId: string) {
  // This would normally fetch from Shopify GraphQL API
  // For demonstration, we're returning mock data
  
  return {
    id: productId,
    title: `Product ${productId}`,
    description: `Detailed description for product ${productId}`,
    price: (Math.random() * 100 + 10).toFixed(2),
    image: "https://placekitten.com/400/600",
    variants: [
      {
        id: `var_${productId}_1`,
        title: "Small",
        price: (Math.random() * 100 + 10).toFixed(2),
        available: true
      },
      {
        id: `var_${productId}_2`,
        title: "Medium",
        price: (Math.random() * 100 + 15).toFixed(2),
        available: true
      },
      {
        id: `var_${productId}_3`,
        title: "Large",
        price: (Math.random() * 100 + 20).toFixed(2),
        available: false
      }
    ]
  };
}

// Astro API Routes
export const ALL: APIRoute = async ({ request }) => {
  return app.fetch(request);
};

export const GET: APIRoute = ALL;
export const POST: APIRoute = ALL;
export const PUT: APIRoute = ALL;
export const DELETE: APIRoute = ALL;

// Cloudflare Worker compatibility
export default {
  fetch: app.fetch
};