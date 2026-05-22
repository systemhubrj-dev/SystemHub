import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import Audience from "@/components/landing/Audience";
import Pricing from "@/components/landing/Pricing";
import Footer from "@/components/landing/Footer";
import CookieConsent from "@/components/CookieConsent";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <Features />
      <Audience />
      <Pricing />
      <Footer />
      <CookieConsent />
    </div>
  );
};

export default Index;
