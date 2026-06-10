import { motion } from "framer-motion";
import { useEffect } from "react";
import { useScroll, useTransform } from "framer-motion";

export const GlobalStyleSync = () => {
  return (
    <style>{`
      :root {
        --spacing-xs: 4px;
        --spacing-sm: 8px;
        --spacing-md: 16px;
        --spacing-lg: 32px;
        --spacing-xl: 64px;
        --spacing-section: 120px;
        
        --gold: #B8955A;
        --text-dark: #1C1C1A;
        --bg-light: #F8F6F2;
      }

      section {
        padding-top: var(--spacing-section);
        padding-bottom: var(--spacing-section);
      }

      h1 { font-size: 72px; line-height: 1.1; }
      h2 { font-size: 56px; line-height: 1.2; }
      h3 { font-size: 42px; line-height: 1.3; }
      h4 { font-size: 30px; line-height: 1.4; }

      @media (max-width: 768px) {
        h1 { font-size: 42px; }
        h2 { font-size: 36px; }
        h3 { font-size: 28px; }
        h4 { font-size: 24px; }
      }

      .section-label {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 20px;
        margin-bottom: 32px;
      }
      .section-label::before, .section-label::after {
        content: "";
        width: 40px;
        height: 1px;
        background: var(--gold);
      }
      .section-label span {
        font-size: 10px;
        letter-spacing: 0.2em;
        text-transform: uppercase;
        color: var(--gold);
        font-weight: 700;
      }
    `}</style>
  );
};
