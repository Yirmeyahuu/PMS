import { renderToString } from 'react-dom/server';
import { LayoutTemplate } from 'lucide-react';
import React from 'react';

const html = renderToString(
  <div className="mx-8 mb-6 p-4 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 select-none">
    <LayoutTemplate className="w-5 h-5 mr-2 text-gray-300" />
    <span className="font-medium tracking-wide">CLINIC LETTER HEAD</span>
  </div>
);
console.log(html);
