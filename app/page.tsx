import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import PropertyGallery from '@/components/PropertyGallery';
import AboutSpace from '@/components/AboutSpace';
import BookingInquiry from '@/components/BookingInquiry';
import LocalGuide from '@/components/LocalGuide';
import FloatingSocialDock from '@/components/FloatingSocialDock';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        <Hero />
        <PropertyGallery />
        <AboutSpace />
        <BookingInquiry />
        <LocalGuide />
      </main>
      <Footer />
      <FloatingSocialDock />
    </div>
  );
}

