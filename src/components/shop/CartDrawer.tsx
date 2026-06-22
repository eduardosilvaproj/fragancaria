import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ShoppingBag, Minus, Plus, Trash2, ExternalLink, Loader2, X } from "lucide-react";
import { useCartStore } from "@/stores/cartStore";
import { cn } from "@/lib/utils";

export const CartDrawer = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { items, isLoading, isSyncing, updateQuantity, removeItem, getCheckoutUrl, syncCart } = useCartStore();
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + (parseFloat(item.price.amount) * item.quantity), 0);
  const currencyCode = items[0]?.price.currencyCode || 'BRL';

  useEffect(() => { 
    if (isOpen) syncCart(); 
  }, [isOpen, syncCart]);

  const handleCheckout = () => {
    const checkoutUrl = getCheckoutUrl();
    if (checkoutUrl) {
      window.open(checkoutUrl, '_blank');
      setIsOpen(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <button className="relative p-2 hover:text-[#D4AF37] transition-colors group">
          <ShoppingBag className="h-5 w-5 stroke-[1.5]" />
          {totalItems > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-5 min-w-5 rounded-full px-1 flex items-center justify-center text-[10px] font-bold bg-[#D4AF37] text-[#0F3A45] shadow-lg">
              {totalItems > 99 ? '99+' : totalItems}
            </span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md flex flex-col h-full p-0 bg-background border-l border-border">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <SheetTitle className="font-serif text-2xl">Sua Sacola</SheetTitle>
          <button onClick={() => setIsOpen(false)} className="p-1 hover:text-primary transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
              <ShoppingBag className="h-12 w-12 text-muted-foreground stroke-[1]" />
              <div>
                <p className="text-lg font-medium">Sua sacola está vazia</p>
                <p className="text-sm text-muted-foreground">Parece que você ainda não adicionou produtos.</p>
              </div>
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Continuar Comprando
              </Button>
            </div>
          ) : (
            <div className="space-y-8">
              {items.map((item) => (
                <div key={item.variantId} className="flex gap-4">
                  <div className="w-24 h-32 bg-secondary flex-shrink-0">
                    {item.product.node.images?.edges?.[0]?.node && (
                      <img 
                        src={item.product.node.images.edges[0].node.url} 
                        alt={item.product.node.title} 
                        className="w-full h-full object-cover" 
                      />
                    )}
                  </div>
                  <div className="flex-1 flex flex-col py-1">
                    <div className="flex justify-between items-start mb-1">
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-primary font-bold mb-1">
                          {item.product.node.vendor}
                        </p>
                        <h4 className="font-serif text-base leading-tight mb-1">{item.product.node.title}</h4>
                        <p className="text-xs text-muted-foreground">
                          {item.selectedOptions.map(option => option.value).join(' • ')}
                        </p>
                      </div>
                      <button 
                        onClick={() => removeItem(item.variantId)}
                        className="text-muted-foreground hover:text-destructive transition-colors p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div className="mt-auto flex justify-between items-center">
                      <div className="flex items-center border border-border rounded-sm">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 flex items-center justify-center hover:bg-muted p-0" 
                          onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center text-xs font-medium">{item.quantity}</span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 flex items-center justify-center hover:bg-muted p-0" 
                          onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="font-medium text-sm">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: currencyCode }).format(parseFloat(item.price.amount) * item.quantity)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="p-6 border-t border-border bg-secondary/30 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm uppercase tracking-widest">Subtotal</span>
              <span className="text-lg font-serif">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: currencyCode }).format(totalPrice)}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider text-center">
              Taxas e frete calculados no checkout
            </p>
            <Button 
              onClick={handleCheckout} 
              className="w-full" 
              size="lg" 
              disabled={items.length === 0 || isLoading || isSyncing}
            >
              {isLoading || isSyncing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Finalizar Compra"
              )}
            </Button>
            <div className="flex flex-wrap items-center justify-center gap-4 pt-2 opacity-60">
                <img src="https://cdn-icons-png.flaticon.com/512/174/174861.png" alt="PayPal" className="h-4 w-auto grayscale" />
                <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/2560px-Visa_Inc._logo.svg.png" alt="Visa" className="h-3 w-auto grayscale" />
                <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/1280px-Mastercard-logo.svg.png" alt="Mastercard" className="h-5 w-auto grayscale" />
                <div className="text-[10px] font-bold tracking-tighter border border-foreground/20 px-1">PIX</div>
                <div className="text-[10px] font-bold tracking-tighter border border-foreground/20 px-1 text-xs">SSL</div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
