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
    setLevel(level: number): void;
    setBounds(bounds: LatLngBounds): void;
    addControl(control: ZoomControl, position: ControlPosition): void;
  }

  interface MapOptions {
    center: LatLng;
    level: number;
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
  }

  class InfoWindow {
    constructor(options: InfoWindowOptions);
    open(map: Map, marker: Marker): void;
    close(): void;
  }

  interface InfoWindowOptions {
    content: string;
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
    disableClickZoom?: boolean;
    styles?: ClusterStyle[];
  }

  interface ClusterStyle {
    width: string;
    height: string;
    background: string;
    color: string;
    textAlign: string;
    lineHeight: string;
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
