import { useState } from "react";
import { Share2, X, Copy, Check, MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const MotionDiv = motion.div as any;

// Social media icons as simple SVG components
const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const TwitterIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const PinterestIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z" />
  </svg>
);

interface ShareButtonsProps {
  productName: string;
  productUrl: string;
  productImage?: string;
  productPrice?: number;
  className?: string;
  variant?: "inline" | "dropdown";
}

export function ShareButtons({
  productName,
  productUrl,
  productImage,
  productPrice,
  className,
  variant = "dropdown",
}: ShareButtonsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const fullUrl = typeof window !== "undefined"
    ? `${window.location.origin}${productUrl}`
    : productUrl;

  const formatPrice = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const shareText = productPrice
    ? `Olha esse produto incrível! ${productName} por ${formatPrice(productPrice)} na Fragranciaria`
    : `Olha esse produto incrível! ${productName} na Fragranciaria`;

  const whatsappMessage = encodeURIComponent(`${shareText}\n\n${fullUrl}`);
  const twitterText = encodeURIComponent(shareText);
  const facebookUrl = encodeURIComponent(fullUrl);
  const pinterestUrl = encodeURIComponent(fullUrl);
  const pinterestImage = productImage ? encodeURIComponent(productImage) : "";
  const pinterestDesc = encodeURIComponent(productName);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      toast.success("Link copiado!", { duration: 2000 });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Erro ao copiar link");
    }
  };

  const shareOptions = [
    {
      name: "WhatsApp",
      icon: <MessageCircle className="w-5 h-5" />,
      href: `https://wa.me/?text=${whatsappMessage}`,
      color: "bg-[#25D366] hover:bg-[#20BD5A]",
    },
    {
      name: "Facebook",
      icon: <FacebookIcon />,
      href: `https://www.facebook.com/sharer/sharer.php?u=${facebookUrl}`,
      color: "bg-[#1877F2] hover:bg-[#166FE5]",
    },
    {
      name: "Twitter/X",
      icon: <TwitterIcon />,
      href: `https://twitter.com/intent/tweet?text=${twitterText}&url=${facebookUrl}`,
      color: "bg-black hover:bg-gray-800",
    },
    {
      name: "Pinterest",
      icon: <PinterestIcon />,
      href: `https://pinterest.com/pin/create/button/?url=${pinterestUrl}&media=${pinterestImage}&description=${pinterestDesc}`,
      color: "bg-[#E60023] hover:bg-[#C8001F]",
    },
  ];

  if (variant === "inline") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <span className="text-[12px] text-[#75827E] mr-1">Compartilhar:</span>
        {shareOptions.map((option) => (
          <a
            key={option.name}
            href={option.href}
            target="_blank"
            rel="noopener noreferrer"
            className="w-9 h-9 flex items-center justify-center text-[#0F3A3E]/60 hover:text-[#0F3A3E] bg-[#F8F4EA] hover:bg-[#E8E0CE] transition-colors"
            aria-label={`Compartilhar no ${option.name}`}
          >
            {option.icon}
          </a>
        ))}
        <button
          onClick={handleCopyLink}
          className="w-9 h-9 flex items-center justify-center text-[#0F3A3E]/60 hover:text-[#0F3A3E] bg-[#F8F4EA] hover:bg-[#E8E0CE] transition-colors"
          aria-label="Copiar link"
        >
          {copied ? <Check className="w-4 h-4 text-[#1c6b4a]" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-[13px] text-[#51635F] hover:text-[#0F3A3E] transition-colors"
      >
        <Share2 className="w-4 h-4" />
        <span>Compartilhar</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown */}
            <MotionDiv
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 mt-2 w-[220px] bg-white border border-[#E9E1D2] shadow-lg z-50"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#E9E1D2]">
                <span className="text-[13px] font-medium text-[#0F3A3E]">
                  Compartilhar
                </span>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-[#75827E] hover:text-[#0F3A3E]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Share options */}
              <div className="p-2">
                {shareOptions.map((option) => (
                  <a
                    key={option.name}
                    href={option.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 hover:bg-[#F8F4EA] transition-colors"
                  >
                    <span className={cn("w-8 h-8 flex items-center justify-center text-white rounded", option.color)}>
                      {option.icon}
                    </span>
                    <span className="text-[13px] text-[#0F3A3E]">{option.name}</span>
                  </a>
                ))}

                {/* Copy link */}
                <button
                  onClick={handleCopyLink}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#F8F4EA] transition-colors"
                >
                  <span className="w-8 h-8 flex items-center justify-center bg-[#F3EEE3] text-[#0F3A3E] rounded">
                    {copied ? <Check className="w-4 h-4 text-[#1c6b4a]" /> : <Copy className="w-4 h-4" />}
                  </span>
                  <span className="text-[13px] text-[#0F3A3E]">
                    {copied ? "Link copiado!" : "Copiar link"}
                  </span>
                </button>
              </div>
            </MotionDiv>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
