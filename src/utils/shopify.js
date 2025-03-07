// src/utils/shopify.js
/**
 * Enhanced Shopify Storefront API utility functions
 */

// Environment variables
const SHOPIFY_STORE_URL = import.meta.env.SHOPIFY_STORE_URL || 'https://your-store.myshopify.com';
const SHOPIFY_STOREFRONT_TOKEN = import.meta.env.SHOPIFY_STOREFRONT_TOKEN || 'your-storefront-api-token';

/**
 * Format price with currency symbol
 * @param {number|string} amount - The price amount
 * @param {string} currencyCode - The currency code (e.g., USD)
 * @returns {string} - Formatted price string
 */
export function formatPrice(amount, currencyCode = 'USD') {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2
  });
  
  return formatter.format(numericAmount);
}

/**
 * Query the Shopify Storefront API with error handling and retry
 * @param {string} query - GraphQL query
 * @param {Object} variables - Query variables
 * @param {number} retries - Number of retry attempts (default: 2)
 * @returns {Promise<Object>} - Query results
 */
export async function queryStorefront(query, variables = {}, retries = 2) {
  let currentTry = 0;
  
  while (currentTry <= retries) {
    try {
      const response = await fetch(`${SHOPIFY_STORE_URL}/api/2023-07/graphql.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_TOKEN
        },
        body: JSON.stringify({ query, variables })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const result = await response.json();
      
      // Check for GraphQL errors
      if (result.errors) {
        throw new Error(result.errors[0].message || 'GraphQL error occurred');
      }
      
      return result;
    } catch (error) {
      currentTry++;
      
      // Throw error if we've used all our retries
      if (currentTry > retries) {
        console.error('Shopify API error after retries:', error);
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      const delay = Math.pow(2, currentTry) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

/**
 * Fetch featured products with enhanced data
 * @param {number} count - Number of products to fetch
 * @returns {Promise<Array>} - Array of product objects
 */
export async function getFeaturedProducts(count = 3) {
  try {
    const { data } = await queryStorefront(`
      {
        products(first: ${count}, query: "tag:featured") {
          edges {
            node {
              id
              title
              handle
              description
              availableForSale
              productType
              priceRange {
                minVariantPrice {
                  amount
                  currencyCode
                }
              }
              compareAtPriceRange {
                minVariantPrice {
                  amount
                  currencyCode
                }
              }
              featuredImage {
                url
                altText
                width
                height
              }
              tags
              vendor
            }
          }
        }
      }
    `);

    // Check if products exist
    if (!data || !data.products || !data.products.edges) {
      return [];
    }

    return data.products.edges.map(edge => {
      const node = edge.node;
      const price = formatPrice(
        node.priceRange.minVariantPrice.amount,
        node.priceRange.minVariantPrice.currencyCode
      );
      
      // Get compareAtPrice if it exists and is greater than the current price
      let compareAtPrice = null;
      if (node.compareAtPriceRange && 
          node.compareAtPriceRange.minVariantPrice && 
          parseFloat(node.compareAtPriceRange.minVariantPrice.amount) > parseFloat(node.priceRange.minVariantPrice.amount)) {
        compareAtPrice = formatPrice(
          node.compareAtPriceRange.minVariantPrice.amount,
          node.compareAtPriceRange.minVariantPrice.currencyCode
        );
      }

      return {
        id: node.id,
        title: node.title,
        handle: node.handle,
        description: node.description,
        price: price,
        compareAtPrice: compareAtPrice,
        image: node.featuredImage?.url || "/placeholder-product.png",
        imageAlt: node.featuredImage?.altText || node.title,
        imageWidth: node.featuredImage?.width,
        imageHeight: node.featuredImage?.height,
        availableForSale: node.availableForSale,
        productType: node.productType,
        vendor: node.vendor,
        tags: node.tags || [],
        isFeatured: true
      };
    });
  } catch (error) {
    console.error('Error fetching featured products:', error);
    throw error;
  }
}

/**
 * Search for products with enhanced information
 * @param {string} searchQuery - Search query
 * @param {number} count - Number of products to fetch
 * @returns {Promise<Array>} - Array of product objects
 */
export async function searchProducts(searchQuery, count = 5) {
  if (!searchQuery || searchQuery.length < 2) {
    return [];
  }
  
  try {
    // Sanitize the query for GraphQL
    const sanitizedQuery = searchQuery.replace(/"/g, '\\"');
    
    const { data } = await queryStorefront(`
      {
        products(first: ${count}, query: "${sanitizedQuery}") {
          edges {
            node {
              id
              title
              handle
              description
              availableForSale
              productType
              priceRange {
                minVariantPrice {
                  amount
                  currencyCode
                }
              }
              compareAtPriceRange {
                minVariantPrice {
                  amount
                  currencyCode
                }
              }
              featuredImage {
                url
                altText
              }
              tags
              vendor
            }
          }
        }
      }
    `);

    return data.products.edges.map(edge => {
      const node = edge.node;
      const price = formatPrice(
        node.priceRange.minVariantPrice.amount,
        node.priceRange.minVariantPrice.currencyCode
      );
      
      // Get compareAtPrice if applicable
      let compareAtPrice = null;
      if (node.compareAtPriceRange && 
          node.compareAtPriceRange.minVariantPrice && 
          parseFloat(node.compareAtPriceRange.minVariantPrice.amount) > parseFloat(node.priceRange.minVariantPrice.amount)) {
        compareAtPrice = formatPrice(
          node.compareAtPriceRange.minVariantPrice.amount,
          node.compareAtPriceRange.minVariantPrice.currencyCode
        );
      }

      return {
        id: node.id,
        title: node.title,
        handle: node.handle,
        description: node.description,
        price: price,
        compareAtPrice: compareAtPrice,
        image: node.featuredImage?.url || "/placeholder-product.png",
        imageAlt: node.featuredImage?.altText || node.title,
        availableForSale: node.availableForSale,
        productType: node.productType,
        vendor: node.vendor,
        tags: node.tags || [],
        isFeatured: node.tags?.includes('featured') || false
      };
    });
  } catch (error) {
    console.error('Error searching products:', error);
    throw error;
  }
}

/**
 * Get a single product by handle
 * @param {string} handle - Product handle/slug
 * @returns {Promise<Object|null>} - Product object or null if not found
 */
export async function getProductByHandle(handle) {
  if (!handle) return null;
  
  try {
    const { data } = await queryStorefront(`
      {
        product(handle: "${handle}") {
          id
          title
          handle
          description
          descriptionHtml
          availableForSale
          productType
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
          }
          compareAtPriceRange {
            minVariantPrice {
              amount
              currencyCode
            }
          }
          featuredImage {
            url
            altText
            width
            height
          }
          images(first: 10) {
            edges {
              node {
                url
                altText
                width
                height
              }
            }
          }
          variants(first: 25) {
            edges {
              node {
                id
                title
                availableForSale
                price {
                  amount
                  currencyCode
                }
                compareAtPrice {
                  amount
                  currencyCode
                }
                selectedOptions {
                  name
                  value
                }
              }
            }
          }
          options {
            name
            values
          }
          tags
          vendor
        }
      }
    `);

    if (!data || !data.product) {
      return null;
    }

    const product = data.product;
    const price = formatPrice(
      product.priceRange.minVariantPrice.amount,
      product.priceRange.minVariantPrice.currencyCode
    );
    
    // Get compareAtPrice if applicable
    let compareAtPrice = null;
    if (product.compareAtPriceRange && 
        product.compareAtPriceRange.minVariantPrice && 
        parseFloat(product.compareAtPriceRange.minVariantPrice.amount) > parseFloat(product.priceRange.minVariantPrice.amount)) {
      compareAtPrice = formatPrice(
        product.compareAtPriceRange.minVariantPrice.amount,
        product.compareAtPriceRange.minVariantPrice.currencyCode
      );
    }

    // Format variants
    const variants = product.variants.edges.map(edge => {
      const variant = edge.node;
      return {
        id: variant.id,
        title: variant.title,
        availableForSale: variant.availableForSale,
        price: formatPrice(variant.price.amount, variant.price.currencyCode),
        compareAtPrice: variant.compareAtPrice ? 
          formatPrice(variant.compareAtPrice.amount, variant.compareAtPrice.currencyCode) : null,
        options: variant.selectedOptions.reduce((acc, option) => {
          acc[option.name] = option.value;
          return acc;
        }, {})
      };
    });

    // Format images
    const images = product.images.edges.map(edge => ({
      url: edge.node.url,
      alt: edge.node.altText || product.title,
      width: edge.node.width,
      height: edge.node.height
    }));

    return {
      id: product.id,
      title: product.title,
      handle: product.handle,
      description: product.description,
      descriptionHtml: product.descriptionHtml,
      price: price,
      compareAtPrice: compareAtPrice,
      image: product.featuredImage?.url || "/placeholder-product.png",
      imageAlt: product.featuredImage?.altText || product.title,
      images: images,
      availableForSale: product.availableForSale,
      productType: product.productType,
      vendor: product.vendor,
      tags: product.tags || [],
      isFeatured: product.tags?.includes('featured') || false,
      variants: variants,
      options: product.options.map(option => ({
        name: option.name,
        values: option.values
      }))
    };
  } catch (error) {
    console.error(`Error fetching product by handle ${handle}:`, error);
    return null;
  }
}

/**
 * Get recent products
 * @param {number} count - Number of products to fetch
 * @returns {Promise<Array>} - Array of product objects
 */
export async function getRecentProducts(count = 4) {
  try {
    const { data } = await queryStorefront(`
      {
        products(first: ${count}, sortKey: CREATED_AT, reverse: true) {
          edges {
            node {
              id
              title
              handle
              description
              availableForSale
              productType
              priceRange {
                minVariantPrice {
                  amount
                  currencyCode
                }
              }
              compareAtPriceRange {
                minVariantPrice {
                  amount
                  currencyCode
                }
              }
              featuredImage {
                url
                altText
              }
              tags
              vendor
            }
          }
        }
      }
    `);

    return data.products.edges.map(edge => {
      const node = edge.node;
      const price = formatPrice(
        node.priceRange.minVariantPrice.amount,
        node.priceRange.minVariantPrice.currencyCode
      );
      
      // Get compareAtPrice if applicable
      let compareAtPrice = null;
      if (node.compareAtPriceRange && 
          node.compareAtPriceRange.minVariantPrice && 
          parseFloat(node.compareAtPriceRange.minVariantPrice.amount) > parseFloat(node.priceRange.minVariantPrice.amount)) {
        compareAtPrice = formatPrice(
          node.compareAtPriceRange.minVariantPrice.amount,
          node.compareAtPriceRange.minVariantPrice.currencyCode
        );
      }

      return {
        id: node.id,
        title: node.title,
        handle: node.handle,
        description: node.description,
        price: price,
        compareAtPrice: compareAtPrice,
        image: node.featuredImage?.url || "/placeholder-product.png",
        imageAlt: node.featuredImage?.altText || node.title,
        availableForSale: node.availableForSale,
        productType: node.productType,
        vendor: node.vendor,
        tags: node.tags || [],
        isFeatured: node.tags?.includes('featured') || false
      };
    });
  } catch (error) {
    console.error('Error fetching recent products:', error);
    throw error;
  }
}