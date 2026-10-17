// Detects the visitor's location via the browser and reverse-geocodes it
// into address fields using OpenStreetMap Nominatim (free, no API key).

export interface DetectedAddress {
  address: string;
  city: string;
  state: string;
  pincode: string;
}

const getPosition = (): Promise<GeolocationPosition> =>
  new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Location is not supported by your browser'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 5 * 60 * 1000,
    });
  });

const geolocationErrorMessage = (err: any): string => {
  switch (err?.code) {
    case 1:
      return 'Location permission denied. Please enter your address manually.';
    case 2:
      return 'Could not determine your location. Please enter your address manually.';
    case 3:
      return 'Location request timed out. Please try again.';
    default:
      return err?.message || 'Could not detect your location.';
  }
};

export const detectAddress = async (): Promise<DetectedAddress> => {
  let position: GeolocationPosition;
  try {
    position = await getPosition();
  } catch (err) {
    throw new Error(geolocationErrorMessage(err));
  }

  const { latitude, longitude } = position.coords;
  const url =
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=18` +
    `&accept-language=en&lat=${latitude}&lon=${longitude}`;

  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error('Could not look up your address. Please enter it manually.');

  const data = await res.json();
  const a = data?.address || {};

  const pincodeDigits = String(a.postcode || '').replace(/\D/g, '');
  const area = [a.house_number, a.road, a.neighbourhood, a.suburb || a.city_district]
    .filter(Boolean)
    .join(', ');

  return {
    address: area,
    city: a.city || a.town || a.village || a.municipality || a.county || a.state_district || '',
    state: a.state || '',
    pincode: pincodeDigits.length === 6 ? pincodeDigits : '',
  };
};
