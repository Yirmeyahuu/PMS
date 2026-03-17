import React, { useMemo } from 'react';
import phLocations from '@/data/ph-locations.json';

const PROVINCES = phLocations.provinces.map((p) => p.province).sort();

const getCities = (province: string): string[] => {
  const found = phLocations.provinces.find((p) => p.province === province);
  return found?.cities ?? [];
};

interface PhLocationSelectProps {
  province:         string;
  city:             string;
  onProvinceChange: (value: string) => void;
  onCityChange:     (value: string) => void;
  provinceError?:   string;
  cityError?:       string;
  disabled?:        boolean;
  required?:        boolean;
}

export const PhLocationSelect: React.FC<PhLocationSelectProps> = ({
  province,
  city,
  onProvinceChange,
  onCityChange,
  provinceError,
  cityError,
  disabled,
  required,
}) => {
  const cities = useMemo(() => getCities(province), [province]);

  // Is the current province value NOT in our list (and not empty)?
  const isKnownProvince  = PROVINCES.includes(province);
  const isOtherProv      = province !== '' && !isKnownProvince;
  // Selected value shown in the province <select>
  const provinceSelectVal = isOtherProv ? '__others__' : province;

  // Is the current city value NOT in the cities list for this province?
  const isKnownCity  = cities.includes(city);
  const isOtherCity  = city !== '' && cities.length > 0 && !isKnownCity;
  // Selected value shown in the city <select>
  const citySelectVal = isOtherCity ? '__others__' : city;

  const handleProvinceSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === '__others__') {
      onProvinceChange('');   // blank → user types in input below
    } else {
      onProvinceChange(val);
    }
    onCityChange('');         // always reset city on province change
  };

  const handleCitySelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === '__others__') {
      onCityChange('');       // blank → user types in input below
    } else {
      onCityChange(val);
    }
  };

  const selectCls = (hasError: boolean) =>
    `w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-sky-400
     disabled:bg-gray-50 disabled:text-gray-400 cursor-pointer
     ${hasError ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-sky-400'}`;

  const inputCls = (hasError: boolean) =>
    `w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-sky-400
     ${hasError ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-sky-400'}`;

  return (
    <>
      {/* ── Province ──────────────────────────────────────────────────────── */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Province {required && <span className="text-red-500">*</span>}
        </label>

        <select
          value={provinceSelectVal}
          onChange={handleProvinceSelectChange}
          disabled={disabled}
          className={selectCls(!!provinceError)}
        >
          <option value="">— Select Province —</option>
          {PROVINCES.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
          <option value="__others__">Others (specify below)</option>
        </select>

        {/* Free-type input shown when user picked "Others" OR typed a custom value */}
        {isOtherProv && (
          <input
            type="text"
            value={province}
            onChange={(e) => onProvinceChange(e.target.value)}
            placeholder="Type your province"
            disabled={disabled}
            className={`mt-2 ${inputCls(!!provinceError)}`}
          />
        )}
        {/* Also show input when dropdown was just switched to Others (province === '') */}
        {provinceSelectVal === '__others__' && !isOtherProv && (
          <input
            type="text"
            value=""
            onChange={(e) => onProvinceChange(e.target.value)}
            placeholder="Type your province"
            disabled={disabled}
            className={`mt-2 ${inputCls(!!provinceError)}`}
          />
        )}

        {provinceError && (
          <p className="mt-1 text-xs text-red-500">{provinceError}</p>
        )}
      </div>

      {/* ── City / Municipality ───────────────────────────────────────────── */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          City / Municipality {required && <span className="text-red-500">*</span>}
        </label>

        {/* Show dropdown only when province is a known PH province AND has cities */}
        {isKnownProvince && cities.length > 0 ? (
          <>
            <select
              value={citySelectVal}
              onChange={handleCitySelectChange}
              disabled={disabled}
              className={selectCls(!!cityError)}
            >
              <option value="">— Select City —</option>
              {cities.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
              <option value="__others__">Others (specify below)</option>
            </select>

            {/* Free-type for city Others */}
            {(isOtherCity || citySelectVal === '__others__') && (
              <input
                type="text"
                value={isOtherCity ? city : ''}
                onChange={(e) => onCityChange(e.target.value)}
                placeholder="Type your city / municipality"
                disabled={disabled}
                className={`mt-2 ${inputCls(!!cityError)}`}
              />
            )}
          </>
        ) : (
          /* Province with no listed cities, Others province, or no province yet → free-type */
          <input
            type="text"
            value={city}
            onChange={(e) => onCityChange(e.target.value)}
            placeholder={!province ? 'Select a province first' : 'Type your city / municipality'}
            disabled={disabled || !province}
            className={inputCls(!!cityError)}
          />
        )}

        {cityError && (
          <p className="mt-1 text-xs text-red-500">{cityError}</p>
        )}
      </div>
    </>
  );
};