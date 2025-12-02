export interface CurtainOption {
  id: string;
  name: string;
  description: string;
  promptModifier: string; // The text to send to AI
}

export interface InteriorStyle {
  id: string;
  name: string;
  icon: string;
  description: string;
  colors: string;
  curtains: CurtainOption[];
}

export interface CurtainColor {
  id: string;
  name: string;
  hex: string;
  prompt: string;
  class?: string; // Tailwind class for background if needed
}

export interface CurtainLayer {
  id: string;
  name: string;
  description: string;
  prompt: string;
}

export interface GeneratedResult {
  imageUrl: string;
  styleName: string;
  curtainName: string;
}