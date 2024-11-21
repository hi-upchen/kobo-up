interface GTMEvent {
  event: string;
  [key: string]: unknown;
}

export const pushToDataLayer = (event: GTMEvent) => {
  if (typeof window !== 'undefined' && window.dataLayer) {
    window.dataLayer.push(event);
  }
};