declare namespace kakao.maps {
  class LatLng {
    constructor(lat: number, lng: number);
    getLat(): number;
    getLng(): number;
  }

  class LatLngBounds {
    constructor();
    extend(latlng: LatLng): void;
  }

  class Map {
    constructor(container: HTMLElement, options: MapOptions);
    setCenter(latlng: LatLng): void;
    setLevel(level: number, options?: { animate?: boolean }): void;
    getLevel(): number;
    setBounds(bounds: LatLngBounds): void;
    addControl(control: ZoomControl, position: ControlPosition): void;
    relayout(): void;
    panTo(latlng: LatLng): void;
  }

  interface MapOptions {
    center: LatLng;
    level: number;
  }

  class Size {
    constructor(width: number, height: number);
  }

  class Point {
    constructor(x: number, y: number);
  }

  class MarkerImage {
    constructor(src: string, size: Size, options?: { offset?: Point });
  }

  class Marker {
    constructor(options: MarkerOptions);
    setMap(map: Map | null): void;
    getPosition(): LatLng;
  }

  interface MarkerOptions {
    position: LatLng;
    title?: string;
    map?: Map;
    image?: MarkerImage;
  }

  class InfoWindow {
    constructor(options: InfoWindowOptions);
    open(map: Map, marker: Marker): void;
    close(): void;
  }

  interface InfoWindowOptions {
    content: string;
  }

  class CustomOverlay {
    constructor(options: CustomOverlayOptions);
    setMap(map: Map | null): void;
    getMap(): Map | null;
    setPosition(position: LatLng): void;
    getPosition(): LatLng;
    setContent(content: string | HTMLElement): void;
    getContent(): string | HTMLElement;
    setZIndex(zIndex: number): void;
    getZIndex(): number;
  }

  interface CustomOverlayOptions {
    content: string | HTMLElement;
    position: LatLng;
    clickable?: boolean;
    xAnchor?: number;
    yAnchor?: number;
    zIndex?: number;
    map?: Map;
  }

  class MarkerClusterer {
    constructor(options: MarkerClustererOptions);
    addMarkers(markers: Marker[]): void;
    clear(): void;
  }

  interface MarkerClustererOptions {
    map: Map;
    averageCenter?: boolean;
    minLevel?: number;
    gridSize?: number;
    disableClickZoom?: boolean;
    styles?: ClusterStyle[];
    calculator?: number[];
  }

  interface ClusterStyle {
    width: string;
    height: string;
    background: string;
    color: string;
    textAlign: string;
    lineHeight: string;
    borderRadius?: string;
    fontWeight?: string;
    fontSize?: string;
  }

  class ZoomControl {
    constructor();
  }

  enum ControlPosition {
    TOP = 1,
    TOPLEFT = 2,
    TOPRIGHT = 3,
    BOTTOM = 4,
    BOTTOMLEFT = 5,
    BOTTOMRIGHT = 6,
    LEFT = 7,
    RIGHT = 8,
  }

  namespace event {
    function addListener(target: Marker | Map, type: string, callback: () => void): void;
  }

  function load(callback: () => void): void;
}

interface Window {
  kakao: {
    maps: typeof kakao.maps & {
      load: (callback: () => void) => void;
      ControlPosition: typeof kakao.maps.ControlPosition;
    };
  };
}
