/** Discriminant for element type. */
export type ElementType =
  | 'button'
  | 'link'
  | 'input'
  | 'select'
  | 'checkbox'
  | 'radio'
  | 'text'
  | 'image'
  | 'icon'
  | 'toggle'
  | string;

/** Visibility/interaction state of an element. */
export type ElementState = 'enabled' | 'disabled' | 'hidden' | 'loading' | 'readonly';

/** ARIA attributes for accessibility. */
export interface AriaAttributes {
  role?: string;
  label?: string;
  describedBy?: string;
  expanded?: boolean;
  checked?: boolean;
  selected?: boolean;
  required?: boolean;
  invalid?: boolean;
  live?: 'polite' | 'assertive' | 'off';
}

/** Pixel coordinates of an element captured during exploration. */
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Base interface shared by all element types. */
export interface AKGElementBase {
  id: string;
  type: ElementType;
  selector: string;
  label: string;
  state: ElementState;
  isInteractive: boolean;
  isDead: boolean;
  aria: AriaAttributes;
  boundingBox?: BoundingBox;
}

/** A clickable button element. */
export interface ButtonElement extends AKGElementBase {
  type: 'button';
  buttonType: 'submit' | 'reset' | 'button';
  triggersEdges: string[];
}

/** A hyperlink element. */
export interface LinkElement extends AKGElementBase {
  type: 'link';
  href: string;
  isExternal: boolean;
  triggersEdge?: string;
}

/** A text input, email, password, etc. */
export interface InputElement extends AKGElementBase {
  type: 'input';
  inputType: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search' | 'date' | 'file' | string;
  placeholder?: string;
  validation?: string;
  maxLength?: number;
  autocomplete?: string;
}

/** A select/dropdown element. */
export interface SelectElement extends AKGElementBase {
  type: 'select';
  options: { value: string; label: string }[];
  isMultiple: boolean;
}

/** A checkbox element. */
export interface CheckboxElement extends AKGElementBase {
  type: 'checkbox';
  checked: boolean;
  groupName?: string;
}

/** A text/heading/paragraph element. */
export interface TextElement extends AKGElementBase {
  type: 'text';
  textContent: string;
  semanticTag: string;
}

/** An image element. */
export interface ImageElement extends AKGElementBase {
  type: 'image';
  src: string;
  alt: string;
  loaded: boolean;
}

/** An icon element (SVG, icon font, etc.). */
export interface IconElement extends AKGElementBase {
  type: 'icon';
  iconName?: string;
}

/** Discriminated union of all element types. */
export type AKGElement =
  | ButtonElement
  | LinkElement
  | InputElement
  | SelectElement
  | CheckboxElement
  | TextElement
  | ImageElement
  | IconElement
  | AKGElementBase;
