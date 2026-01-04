import heroScrewsBg from "@/assets/hero-screws-new.jpg";

interface PageBackgroundProps {
  children: React.ReactNode;
}

export const PageBackground = ({ children }: PageBackgroundProps) => {
  return (
    <div className="min-h-screen flex flex-col bg-background relative">
      {/* Background image with transparency */}
      <div 
        className="fixed inset-0 bg-cover bg-center opacity-10 pointer-events-none"
        style={{ backgroundImage: `url(${heroScrewsBg})` }}
      />
      <div className="fixed inset-0 bg-gradient-to-b from-background/50 via-background/80 to-background pointer-events-none" />
      
      {/* Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {children}
      </div>
    </div>
  );
};
