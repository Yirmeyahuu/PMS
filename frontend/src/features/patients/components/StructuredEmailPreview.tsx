import { CalendarDays, Clock, MapPin, User, Stethoscope, Building2, ClipboardList, Info } from 'lucide-react';

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase()
          ? <mark key={i} className="bg-yellow-200 text-yellow-900 rounded-sm px-0.5">{part}</mark>
          : <span key={i}>{part}</span>
      )}
    </>
  );
}

interface StructuredEmailPreviewProps {
  text: string;
  searchQuery?: string;
}

interface ParsedEmail {
  header: string;
  intro: string[];
  details: Record<string, string>;
  footer: string[];
  isStructured: boolean;
}

function parseEmail(rawText: string): ParsedEmail {
  const parsed: ParsedEmail = {
    header: '',
    intro: [],
    details: {},
    footer: [],
    isStructured: false,
  };

  const lines = rawText.split('\n');
  let currentSection = 'header';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Identify structural markers
    if (line === 'YOUR APPOINTMENT' || line === 'APPOINTMENT DETAILS' || line === 'YOUR MISSED APPOINTMENT') {
      currentSection = 'details';
      parsed.isStructured = true;
      continue;
    }

    // Identify the confirmation block to strip it out entirely
    if (line.includes('Will you proceed with your appointment as scheduled?')) {
      currentSection = 'skip_confirmation';
      continue;
    }

    if (currentSection === 'skip_confirmation') {
      // Resume parsing if we hit standard footer text
      if (line.includes('If you have any questions') || line.startsWith('---')) {
        currentSection = 'footer';
      } else {
        continue;
      }
    }

    // Skip ascii divider lines used in plain text
    if (/^-{3,}$/.test(line)) {
      if (currentSection === 'footer') {
        parsed.footer.push(line); // Keep actual footer divider
      }
      continue;
    }

    if (!line) continue;

    // Process line based on active section
    if (currentSection === 'header') {
      if (!parsed.header && (line.includes('APPOINTMENT') || line.includes('—'))) {
        parsed.header = line;
      } else {
        parsed.intro.push(line);
      }
    } else if (currentSection === 'details') {
      const match = line.match(/^([A-Za-z\s]+):\s+(.+)$/);
      if (match) {
        parsed.details[match[1].trim()] = match[2].trim();
      } else {
        // If we hit non-key-value text, assume it's the footer starting
        currentSection = 'footer';
        parsed.footer.push(line);
      }
    } else if (currentSection === 'footer') {
      parsed.footer.push(line);
    }
  }

  return parsed;
}

function getIconForDetail(key: string) {
  const k = key.toLowerCase();
  if (k.includes('date')) return <CalendarDays className="w-4 h-4 text-sky-500" />;
  if (k.includes('time')) return <Clock className="w-4 h-4 text-amber-500" />;
  if (k.includes('location') || k.includes('address')) return <MapPin className="w-4 h-4 text-emerald-500" />;
  if (k.includes('practitioner') || k.includes('provider')) return <User className="w-4 h-4 text-purple-500" />;
  if (k.includes('service') || k.includes('type')) return <Stethoscope className="w-4 h-4 text-rose-500" />;
  if (k.includes('booking ref')) return <ClipboardList className="w-4 h-4 text-indigo-500" />;
  return <Info className="w-4 h-4 text-gray-400" />;
}

export function StructuredEmailPreview({ text, searchQuery = '' }: StructuredEmailPreviewProps) {
  // If no text, return empty
  if (!text) return <p className="text-[12.5px] text-gray-400 italic">No preview available.</p>;

  // Try parsing the text
  const parsed = parseEmail(text);

  // If the parser didn't find the appointment details block, render as cleaned text
  if (!parsed.isStructured) {
    // Strip confirmation links safely using regex as fallback
    const cleanedText = text.replace(/Will you proceed with your appointment as scheduled\?[\s\S]*?(?=If you have any questions|---|$)/i, '').trim();

    return (
      <div className="text-[12.5px] text-gray-700 leading-relaxed whitespace-pre-line">
        <Highlight text={cleanedText} query={searchQuery} />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col w-full max-w-2xl mt-2">
      {/* Email Header Area */}
      {parsed.header && (
        <div className="bg-slate-50 px-5 py-3 border-b border-gray-100 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center shrink-0">
            <Building2 className="w-4 h-4 text-sky-600" />
          </div>
          <h3 className="text-sm font-semibold text-slate-800">
            <Highlight text={parsed.header} query={searchQuery} />
          </h3>
        </div>
      )}

      {/* Body Area */}
      <div className="p-5 space-y-6">
        {/* Intro paragraphs */}
        {parsed.intro.length > 0 && (
          <div className="space-y-3">
            {parsed.intro.map((para, i) => (
              <p key={i} className="text-[13px] text-gray-700 leading-relaxed">
                <Highlight text={para} query={searchQuery} />
              </p>
            ))}
          </div>
        )}

        {/* Structured Appointment Details */}
        {Object.keys(parsed.details).length > 0 && (
          <div className="bg-gray-50/50 rounded-xl border border-gray-100 p-4">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 px-1">
              Your Appointment
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
              {Object.entries(parsed.details).map(([key, value], idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0 bg-white p-1.5 rounded-md shadow-sm border border-gray-100">
                    {getIconForDetail(key)}
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-0.5">
                      <Highlight text={key} query={searchQuery} />
                    </p>
                    <p className="text-[13px] font-semibold text-gray-900">
                      <Highlight text={value} query={searchQuery} />
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer paragraphs */}
        {parsed.footer.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-gray-100">
            {parsed.footer.map((para, i) => {
              // Special muted styling for the autogenerated footer notice
              if (para.includes('generated automatically') || para.includes('do not reply') || para.includes('Powered by') || para.startsWith('---')) {
                return (
                  <p key={i} className="text-[11px] text-gray-400">
                    <Highlight text={para} query={searchQuery} />
                  </p>
                );
              }
              return (
                <p key={i} className="text-[12.5px] text-gray-600">
                  <Highlight text={para} query={searchQuery} />
                </p>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
