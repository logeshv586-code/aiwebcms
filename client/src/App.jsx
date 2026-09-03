import { Route, Routes } from 'react-router-dom';
import StoreLayout from './layouts/StoreLayout';
import Home from './pages/Home';
import Shop from './pages/Shop';
import Product from './pages/Product';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import CmsPage from './pages/CmsPage';
import Faq from './pages/Faq';
import DynamicFormPage from './pages/DynamicFormPage';
import AuthPage from './pages/AuthPage';
import Account from './pages/Account';
import Orders from './pages/Orders';
import TrackOrder from './pages/TrackOrder';
import Wishlist from './pages/Wishlist';
import Addresses from './pages/Addresses';
import Blog from './pages/Blog';
import BlogPost from './pages/BlogPost';
import Category from './pages/Category';
import AdminLogin from './admin/AdminLogin';
import AdminLayout from './admin/AdminLayout';
import Dashboard from './admin/pages/Dashboard';
import Products from './admin/pages/Products';
import Catalog from './admin/pages/Catalog';
import Homepage from './admin/pages/Homepage';
import Content from './admin/pages/Content';
import Forms from './admin/pages/Forms';
import Settings from './admin/pages/Settings';
import AdminOrders from './admin/pages/AdminOrders';
import Customers from './admin/pages/Customers';
import Navigation from './admin/pages/Navigation';
import Promotions from './admin/pages/Promotions';
import Staff from './admin/pages/Staff';
import Integrations from './admin/pages/Integrations';
import Inventory from './admin/pages/Inventory';
import Reports from './admin/pages/Reports';
import PaymentReviews from './admin/pages/PaymentReviews';
import PaymentComplete from './pages/PaymentComplete';
import PasswordReset from './pages/PasswordReset';
import TaxonomyPage from './pages/TaxonomyPage';

export default function App() {
  return <Routes>
    <Route path="/admin/login" element={<AdminLogin/>}/>
    <Route path="/admin" element={<AdminLayout/>}>
      <Route index element={<Dashboard/>}/>
      <Route path="products" element={<Products/>}/>
      <Route path="catalog" element={<Catalog/>}/>
      <Route path="inventory" element={<Inventory/>}/>
      <Route path="orders" element={<AdminOrders/>}/>
      <Route path="customers" element={<Customers/>}/>
      <Route path="reports" element={<Reports/>}/>
      <Route path="payment-reviews" element={<PaymentReviews/>}/>
      <Route path="homepage" element={<Homepage/>}/>
      <Route path="content" element={<Content/>}/>
      <Route path="forms" element={<Forms/>}/>
      <Route path="navigation" element={<Navigation/>}/>
      <Route path="promotions" element={<Promotions/>}/>
      <Route path="settings" element={<Settings/>}/>
      <Route path="staff" element={<Staff/>}/>
      <Route path="integrations" element={<Integrations/>}/>
    </Route>

    <Route element={<StoreLayout/>}>
      <Route path="/" element={<Home/>}/>
      <Route path="/shop" element={<Shop/>}/>
      <Route path="/product/:slug" element={<Product/>}/>
      <Route path="/category/:slug" element={<Category/>}/>
      <Route path="/collection/:slug" element={<TaxonomyPage type="collection"/>}/>
      <Route path="/brand/:slug" element={<TaxonomyPage type="brand"/>}/>
      <Route path="/cart" element={<Cart/>}/>
      <Route path="/checkout" element={<Checkout/>}/>
      <Route path="/page/:slug" element={<CmsPage/>}/>
      <Route path="/faq" element={<Faq/>}/>
      <Route path="/form/:key" element={<DynamicFormPage/>}/>
      <Route path="/login" element={<AuthPage mode="login"/>}/>
      <Route path="/register" element={<AuthPage mode="register"/>}/>
      <Route path="/forgot-password" element={<PasswordReset mode="forgot"/>}/>
      <Route path="/reset-password" element={<PasswordReset mode="reset"/>}/>
      <Route path="/payment/complete" element={<PaymentComplete/>}/>
      <Route path="/account" element={<Account/>}/>
      <Route path="/account/orders" element={<Orders/>}/>
      <Route path="/account/wishlist" element={<Wishlist/>}/>
      <Route path="/account/addresses" element={<Addresses/>}/>
      <Route path="/track-order" element={<TrackOrder/>}/>
      <Route path="/blog" element={<Blog/>}/>
      <Route path="/blog/:slug" element={<BlogPost/>}/>
      <Route path="*" element={<main className="section"><div className="container narrow"><div className="empty"><h1>Page not found</h1><p>This page does not exist or is not published.</p></div></div></main>}/>
    </Route>
  </Routes>;
}
