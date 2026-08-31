import React, { useEffect, useState } from 'react';
import { Property } from '../types';
import { useAuth } from '../context/AuthContext';
import { getPropertyById, updateProperty } from '../services/dataService';
import {
  MapPin,
  Compass,
  Navigation,
  CheckCircle,
  AlertCircle,
  RotateCw,
  Save,
  Building2,
  Sliders,
} from 'lucide-react';

export default function ManagerGeolocationSetup() {
  const { currentUser } = useAuth();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Geolocation state
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [radius, setRadius] = useState<number>(100);
  const [detecting, setDetecting] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const loadProperty = async () => {
    if (!currentUser?.propertyId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const prop = await getPropertyById(currentUser.propertyId);
      if (prop) {
        setProperty(prop);
        setLat(prop.latitude);
        setLng(prop.longitude);
        setRadius(prop.geofenceRadiusM ?? 100);
      }
    } catch (err) {
      console.error('Failed to load property for manager', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProperty();
  }, [currentUser?.propertyId]);

  const handleDetectLocation = () => {
    setGeoError(null);
    setSaveSuccess(null);

    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser or environment.');
      return;
    }

    setDetecting(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(Number(position.coords.latitude.toFixed(6)));
        setLng(Number(position.coords.longitude.toFixed(6)));
        setDetecting(false);
      },
      (error) => {
        setDetecting(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setGeoError(
              'Location permission was denied. Please allow location access in your browser settings to detect coordinates.'
            );
            break;
          case error.POSITION_UNAVAILABLE:
            setGeoError('Location information is currently unavailable. Please try again.');
            break;
          case error.TIMEOUT:
            setGeoError('Location request timed out. Please check your signal and try again.');
            break;
          default:
            setGeoError('An unknown error occurred while retrieving location.');
            break;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeoError(null);
    setSaveSuccess(null);

    if (!property) {
      setGeoError('No property found to update.');
      return;
    }

    if (lat === null || lng === null) {
      setGeoError('Please detect your location or set latitude and longitude coordinates.');
      return;
    }

    if (!radius || radius <= 0) {
      setGeoError('Geofence radius must be greater than 0 meters.');
      return;
    }

    try {
      setSaving(true);
      const updated = await updateProperty(property.id, {
        latitude: lat,
        longitude: lng,
        geofenceRadiusM: Number(radius),
      });

      if (updated) {
        setProperty(updated);
        setSaveSuccess(`Geofence for "${updated.name}" saved successfully!`);
        setTimeout(() => setSaveSuccess(null), 4000);
      }
    } catch (err) {
      console.error('Failed to save property geofence', err);
      setGeoError('Failed to save geofence. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-400">Loading assigned property details...</p>
      </div>
    );
  }

  if (!currentUser?.propertyId || !property) {
    return (
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-8 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
        <h2 className="text-lg font-bold text-white">No Property Assigned</h2>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          You are currently not assigned to any property. Please contact the Owner to assign you to a property before setting up geolocation.
        </p>
      </div>
    );
  }

  const hasConfiguredCoordinates = property.latitude !== null && property.longitude !== null;

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Compass className="w-5 h-5 text-blue-400" />
            Property Geolocation Setup
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Configure the physical GPS coordinates and staff check-in geofence radius.
          </p>
        </div>
        <div
          className={`text-xs px-3 py-1.5 rounded-lg border flex items-center gap-1.5 self-start sm:self-auto ${
            hasConfiguredCoordinates
              ? 'bg-emerald-950/50 text-emerald-300 border-emerald-800/40'
              : 'bg-amber-950/50 text-amber-300 border-amber-800/40'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${hasConfiguredCoordinates ? 'bg-emerald-400' : 'bg-amber-400'}`} />
          <span>{hasConfiguredCoordinates ? 'Geofence Active' : 'Setup Pending'}</span>
        </div>
      </div>

      {/* Notifications */}
      {saveSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {geoError && (
        <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{geoError}</span>
        </div>
      )}

      {/* Property Details Card */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-400" />
              <h3 className="font-bold text-lg text-white">{property.name}</h3>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span>{property.address}</span>
            </div>
          </div>
          <div className="text-xs font-mono text-slate-500 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
            ID: {property.id}
          </div>
        </div>

        {/* Existing Saved Coordinates Summary */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <span className="text-slate-500 block mb-0.5">Current Latitude</span>
            <span className="font-mono text-slate-200 font-medium">
              {property.latitude !== null ? property.latitude : 'Not configured'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block mb-0.5">Current Longitude</span>
            <span className="font-mono text-slate-200 font-medium">
              {property.longitude !== null ? property.longitude : 'Not configured'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block mb-0.5">Geofence Radius</span>
            <span className="font-mono text-slate-200 font-medium">
              {property.geofenceRadiusM !== null ? `${property.geofenceRadiusM} meters` : 'Not configured'}
            </span>
          </div>
        </div>
      </div>

      {/* Location Detection & Geofence Form */}
      <form onSubmit={handleSave} className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 sm:p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div>
            <h4 className="font-semibold text-slate-200 text-sm">Coordinates &amp; Range Configuration</h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Click detection while physically at the hostel site, or adjust radius as needed.
            </p>
          </div>

          <button
            id="detect-location-btn"
            type="button"
            onClick={handleDetectLocation}
            disabled={detecting}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold shadow transition cursor-pointer shrink-0"
          >
            {detecting ? (
              <>
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                Detecting GPS...
              </>
            ) : (
              <>
                <Navigation className="w-3.5 h-3.5" />
                {lat !== null ? 'Re-Detect My Location' : 'Detect My Location'}
              </>
            )}
          </button>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label htmlFor="latitude-display" className="block text-xs font-medium text-slate-300 mb-1.5">
              Latitude
            </label>
            <input
              id="latitude-display"
              type="number"
              step="any"
              value={lat ?? ''}
              onChange={(e) => setLat(e.target.value === '' ? null : Number(e.target.value))}
              placeholder="e.g. 30.0869"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-100 text-sm font-mono placeholder:text-slate-600 outline-none transition"
            />
          </div>

          <div>
            <label htmlFor="longitude-display" className="block text-xs font-medium text-slate-300 mb-1.5">
              Longitude
            </label>
            <input
              id="longitude-display"
              type="number"
              step="any"
              value={lng ?? ''}
              onChange={(e) => setLng(e.target.value === '' ? null : Number(e.target.value))}
              placeholder="e.g. 78.2676"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-100 text-sm font-mono placeholder:text-slate-600 outline-none transition"
            />
          </div>

          <div>
            <label htmlFor="geofence-radius-input" className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Geofence Radius (meters)</span>
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <Sliders className="w-3 h-3" /> default 100m
              </span>
            </label>
            <input
              id="geofence-radius-input"
              type="number"
              min="10"
              max="5000"
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              placeholder="100"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-100 text-sm font-mono placeholder:text-slate-600 outline-none transition"
            />
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
          <p className="text-xs text-slate-500">
            Staff selfie clock-ins will be verified against this radius boundary.
          </p>
          <button
            id="save-geofence-btn"
            type="submit"
            disabled={saving || lat === null || lng === null}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold shadow transition cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving...' : 'Save Geofence'}
          </button>
        </div>
      </form>
    </div>
  );
}
