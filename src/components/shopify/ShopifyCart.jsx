// src/components/shopify/ShopifyCart.jsx
import React, { useState, useEffect, useCallback } from 'react';

const ShopifyCart = () => {
  const [cart, setCart] = useState({
    id: '',
    items: [],
    total: 0,
    isOpen: false,
    isLoading: true,
    notification: null
  });
  
  // Initialize cart from localStorage or create a new one
  const initializeCart = useCallback(async () => {
    try {
      // Check localStorage first
      const savedCart = localStorage.getItem('shopifyCart');
      
      if (savedCart) {
        setCart({...JSON.parse(savedCart), isLoading: false});
      } else {
        // Create a fresh cart
        setCart({
          id: `checkout_${Date.now()}`,
          items: [],
          total: 0,
          isOpen: false,
          isLoading: false,
          notification: null
        });
      }
    } catch (error) {
      console.error('Error initializing cart:', error);
      setCart(prevCart => ({...prevCart, isLoading: false}));
    }
  }, []);

  // Handle adding products to cart
  const handleAddToCart = useCallback(async (event) => {
    const { productId, productTitle, productPrice, productImage } = event.detail;
    
    // Show loading indicator
    setCart(prevCart => ({
      ...prevCart,
      isLoading: true
    }));
    
    try {
      // Gather product info (would come from API in production)
      const productInfo = {
        id: productId,
        title: productTitle || `Product ${productId}`,
        price: productPrice || 29.99,
        image: productImage || '/placeholder-product.png',
        quantity: 1
      };
      
      // Add to cart
      setCart(prevCart => {
        // Check if product already exists in cart
        const existingItemIndex = prevCart.items.findIndex(item => item.id === productId);
        
        let updatedItems;
        if (existingItemIndex >= 0) {
          // Update quantity if product already in cart
          updatedItems = [...prevCart.items];
          updatedItems[existingItemIndex] = {
            ...updatedItems[existingItemIndex],
            quantity: updatedItems[existingItemIndex].quantity + 1
          };
        } else {
          // Add new product to cart
          updatedItems = [...prevCart.items, productInfo];
        }
        
        const newTotal = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        return {
          ...prevCart,
          items: updatedItems,
          total: newTotal,
          isOpen: true,
          isLoading: false,
          notification: {
            type: 'success',
            message: `${productInfo.title} added to cart`
          }
        };
      });
      
      // Hide notification after delay
      setTimeout(() => {
        setCart(prevCart => ({
          ...prevCart,
          notification: null
        }));
      }, 3000);
      
    } catch (error) {
      console.error('Error adding item to cart:', error);
      setCart(prevCart => ({
        ...prevCart,
        isLoading: false,
        notification: {
          type: 'error',
          message: 'Failed to add item to cart'
        }
      }));
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (!cart.isLoading) {
      localStorage.setItem('shopifyCart', JSON.stringify(cart));
    }
  }, [cart]);

  // Initialize cart and set up event listeners
  useEffect(() => {
    initializeCart();

    // Listen for product added events
    window.addEventListener('product:added-to-cart', handleAddToCart);
    
    return () => {
      window.removeEventListener('product:added-to-cart', handleAddToCart);
    };
  }, [initializeCart, handleAddToCart]);

  // Update item quantity in cart
  const updateQuantity = useCallback((itemId, newQuantity) => {
    if (newQuantity < 1) return;
    
    setCart(prevCart => {
      const updatedItems = prevCart.items.map(item => 
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      );
      
      return {
        ...prevCart,
        items: updatedItems,
        total: updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
      };
    });
  }, []);

  // Remove item from cart
  const removeItem = useCallback((itemId) => {
    setCart(prevCart => {
      const removedItem = prevCart.items.find(item => item.id === itemId);
      const updatedItems = prevCart.items.filter(item => item.id !== itemId);
      
      return {
        ...prevCart,
        items: updatedItems,
        total: updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        notification: {
          type: 'info',
          message: removedItem ? `${removedItem.title} removed from cart` : 'Item removed'
        }
      };
    });
    
    // Hide notification after delay
    setTimeout(() => {
      setCart(prevCart => ({
        ...prevCart,
        notification: null
      }));
    }, 3000);
  }, []);

  // Toggle cart open/closed
  const toggleCart = useCallback(() => {
    setCart(prevCart => ({
      ...prevCart,
      isOpen: !prevCart.isOpen
    }));
  }, []);

  // Handle checkout process
  const checkout = useCallback(() => {
    if (cart.items.length === 0) return;
    
    // In a real implementation, you would:
    // 1. Create a checkout session with Shopify Storefront API
    // 2. Redirect the user to the checkout URL
    setCart(prevCart => ({
      ...prevCart,
      isLoading: true
    }));
    
    // Simulate API delay
    setTimeout(() => {
      alert('In a real implementation, this would redirect to Shopify checkout');
      setCart(prevCart => ({
        ...prevCart,
        isLoading: false
      }));
    }, 1000);
  }, [cart.items.length]);
  
  // Format currency
  const formatPrice = useCallback((price) => {
    return `$${parseFloat(price).toFixed(2)}`;
  }, []);

  return (
    <div className="relative">
      {/* Cart notification toast */}
      {cart.notification && (
        <div 
          className={`absolute -top-16 right-0 p-3 rounded-md shadow-md text-white text-sm font-medium transition-opacity duration-300 
            ${cart.notification.type === 'success' ? 'bg-green-600' : 
              cart.notification.type === 'error' ? 'bg-red-600' : 'bg-blue-600'}`}
        >
          {cart.notification.message}
        </div>
      )}
    
      {/* Cart button */}
      <button 
        className="flex items-center bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg shadow-md transition-all duration-200 transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50"
        onClick={toggleCart}
        disabled={cart.isLoading}
        aria-label="Shopping cart"
        aria-expanded={cart.isOpen}
      >
        <svg className="w-5 h-5 mr-2" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
          <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path>
        </svg>
        {cart.isLoading ? (
          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ) : (
          <span>Cart ({cart.items.length})</span>
        )}
      </button>
      
      {/* Cart Dropdown */}
      {cart.isOpen && (
        <div 
          className="absolute right-0 mt-3 w-96 bg-white rounded-lg shadow-xl z-10 overflow-hidden transition-all duration-300 transform"
          role="dialog"
          aria-label="Shopping cart contents"
        >
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-800">Your Shopping Cart</h3>
            <p className="text-sm text-gray-500">{cart.items.length} {cart.items.length === 1 ? 'item' : 'items'}</p>
          </div>
          
          <div className="max-h-72 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            {cart.items.length === 0 ? (
              <div className="p-8 text-center">
                <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
                <p className="text-gray-500 mb-2">Your cart is empty</p>
                <p className="text-gray-400 text-sm">Add items to get started</p>
              </div>
            ) : (
              cart.items.map(item => (
                <div key={item.id} className="p-4 border-b border-gray-100 flex items-center hover:bg-gray-50 transition-colors">
                  <img 
                    src={item.image} 
                    alt={item.title}
                    className="w-16 h-16 object-cover rounded-md shadow-sm mr-3"
                    onError={(e) => { e.target.src = '/placeholder-product.png' }}
                  />
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-800">{item.title}</h4>
                    <p className="text-xs text-gray-500 mt-1">Item #{typeof item.id === 'string' ? item.id.split('_').pop() : item.id}</p>
                    <div className="flex items-center mt-2">
                      <button 
                        className="w-6 h-6 bg-gray-100 hover:bg-gray-200 rounded-md flex items-center justify-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        aria-label="Decrease quantity"
                      >
                        <svg className="w-3 h-3 text-gray-600" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                          <path d="M20 12H4"></path>
                        </svg>
                      </button>
                      <span className="mx-2 text-sm font-medium text-gray-700 w-8 text-center">{item.quantity}</span>
                      <button 
                        className="w-6 h-6 bg-gray-100 hover:bg-gray-200 rounded-md flex items-center justify-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        aria-label="Increase quantity"
                      >
                        <svg className="w-3 h-3 text-gray-600" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                          <path d="M12 4v16m8-8H4"></path>
                        </svg>
                      </button>
                      <span className="ml-auto text-sm font-semibold text-gray-900">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                      <button 
                        className="ml-3 p-1 text-gray-400 hover:text-red-500 transition-colors"
                        onClick={() => removeItem(item.id)}
                        aria-label={`Remove ${item.title} from cart`}
                      >
                        <svg className="w-4 h-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                          <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div className="p-4 border-t border-gray-100 bg-gray-50">
            <div className="flex justify-between mb-3">
              <span className="font-medium text-gray-600">Subtotal:</span>
              <span className="font-bold text-gray-800">{formatPrice(cart.total)}</span>
            </div>
            
            <div className="flex justify-between mb-4 text-sm">
              <span className="text-gray-500">Shipping & taxes calculated at checkout</span>
            </div>
            
            <button 
              className={`w-full py-2 rounded-md transition-colors text-white font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                cart.items.length === 0 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'
              }`}
              onClick={checkout}
              disabled={cart.items.length === 0 || cart.isLoading}
            >
              {cart.isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                'Proceed to Checkout'
              )}
            </button>
            
            <button 
              className="w-full text-gray-600 hover:text-gray-800 text-sm mt-3 focus:outline-none"
              onClick={toggleCart}
            >
              Continue Shopping
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShopifyCart;