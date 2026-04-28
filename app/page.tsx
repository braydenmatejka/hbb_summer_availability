'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Response = {
  name: string;
  selected_dates: string[];
};

export default function Home() {
  const [name, setName] = useState('');
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [responses, setResponses] = useState<Response[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<'select' | 'deselect'>('select');

  const generateDates = () => {
    const dates = [];
    const start = new Date('2026-05-01T00:00:00');
    const end = new Date('2026-09-30T00:00:00');

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d));
    }

    return dates;
  };

  const formatDateKey = (date: Date) => date.toISOString().split('T')[0];

  const dates = generateDates();

  const months = dates.reduce<Record<string, Date[]>>((acc, date) => {
    const monthName = date.toLocaleString('default', {
      month: 'long',
      year: 'numeric',
    });

    if (!acc[monthName]) acc[monthName] = [];
    acc[monthName].push(date);

    return acc;
  }, {});

  const fetchResponses = async () => {
    const { data, error } = await supabase
      .from('availability_responses')
      .select('name, selected_dates');

    if (error) {
      console.error(error);
      return;
    }

    setResponses(data || []);
  };

  useEffect(() => {
    fetchResponses();
  }, []);

  const setDateSelection = (date: string, shouldSelect: boolean) => {
    setSelectedDates((prev) => {
      if (shouldSelect && !prev.includes(date)) {
        return [...prev, date];
      }
  
      if (!shouldSelect && prev.includes(date)) {
        return prev.filter((d) => d !== date);
      }
  
      return prev;
    });
  };
  
  const startDrag = (date: string) => {
    const shouldSelect = !selectedDates.includes(date);
  
    setDragMode(shouldSelect ? 'select' : 'deselect');
    setIsDragging(true);
    setDateSelection(date, shouldSelect);
  };
  
  const dragOverDate = (date: string) => {
    if (!isDragging) return;
  
    setDateSelection(date, dragMode === 'select');
  };
  
  const stopDrag = () => {
    setIsDragging(false);
  };

  const loadExistingResponse = async () => {
    if (!name.trim()) return;

    const { data, error } = await supabase
      .from('availability_responses')
      .select('selected_dates')
      .eq('name', name.trim())
      .single();

    if (error) {
      setSelectedDates([]);
      setStatusMessage('No saved response found for this name.');
      return;
    }

    setSelectedDates(data.selected_dates || []);
    setStatusMessage('Loaded saved availability. You can edit and resubmit.');
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      alert('Please enter your name.');
      return;
    }

    const { error } = await supabase.from('availability_responses').upsert(
      {
        name: name.trim(),
        selected_dates: selectedDates,
      },
      {
        onConflict: 'name',
      }
    );

    if (error) {
      console.error(error);
      alert('Something went wrong while saving.');
      return;
    }

    alert('Availability saved!');
    fetchResponses();
  };

  const getAvailableNames = (dateKey: string) => {
    return responses
      .filter((response) => response.selected_dates.includes(dateKey))
      .map((response) => response.name);
  };

  const getUnavailableNames = (dateKey: string) => {
    return responses
      .filter((response) => !response.selected_dates.includes(dateKey))
      .map((response) => response.name);
  };

  const hexToRgb = (hex: string) => {
    const clean = hex.replace('#', '');
    const bigint = parseInt(clean, 16);
    return {
      r: (bigint >> 16) & 255,
      g: (bigint >> 8) & 255,
      b: bigint & 255,
    };
  };
  
  const interpolate = (c1: any, c2: any, t: number) => {
    return {
      r: Math.round(c1.r + (c2.r - c1.r) * t),
      g: Math.round(c1.g + (c2.g - c1.g) * t),
      b: Math.round(c1.b + (c2.b - c1.b) * t),
    };
  };
  
  const getHeatColor = (dateKey: string) => {
    if (responses.length === 0) return '#ffffff';
  
    const availableCount = getAvailableNames(dateKey).length;
    const t = Math.max(0, Math.min(1, availableCount / responses.length));
  
    // 🎨 Your custom colors
    const start = hexToRgb('#E12C2C'); // red
    const mid   = hexToRgb('#FFD700'); // orange/yellow
    const end   = hexToRgb('#2D9B2B'); // dark green
 
    let color;
  
    if (t < 0.5) {
      color = interpolate(start, mid, t * 2);
    } else {
      color = interpolate(mid, end, (t - 0.5) * 2);
    }
  
    return `rgba(${color.r}, ${color.g}, ${color.b}, 0.85)`;
  };

  return (
    <main
      onMouseUp={stopDrag}
      onMouseLeave={stopDrag}
      style={{
        padding: 40,
        fontWeight: 400,
        fontSize: 15,
        background: 'white',
        color: 'black',
        minHeight: '100vh',
      }}
    >
    
    <h1 style={{color: 'black', fontSize: 30, fontWeight: 800}}
    > HBB Summer Calendar
    </h1>

    <h1 style={{marginTop: 5}}> Welcome to the HBB summer calendar! Enter your name, select your availability, then submit. </h1>
    <h1 style={{marginBottom: 5}}>  If your plans change, click "Load Previous Response" to edit your availability. </h1>

      <div style={{ marginBottom: 30 }}>
        <input
          placeholder="Enter your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{
            marginTop: 10,
            padding: 10,
            color: 'black',
            background: 'white',
            border: '1px solid #999',
            borderRadius: 6,
          }}
        />

        <button
          onClick={handleSubmit}
          style={{
            width: 160,
            marginLeft: 8,
            padding: '10px 18px',
            color: 'black',
            background: '#e5e7eb',
            border: '1px solid #999',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          Submit
        </button>
        
        <button
          onClick={loadExistingResponse}
          style={{
            marginLeft: 10,
            padding: '10px 14px',
            color: 'black',
            background: '#e5e7eb',
            border: '1px solid #999',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        > Load Previous Response
        </button>

        <a
          href="/complaint.jpg"
          target="_blank"
          rel="noopener noreferrer"
        >
          <button
            style={{
              marginLeft: 10,
              padding: '10px 16px',
              borderRadius: 8,
              border: '1px solid #999',
              background: '#e5e7eb',
              color: 'black',
              cursor: 'pointer',
              marginTop: 10,
            }}
          >
            Request Bugfix
          </button>
        </a>

        {statusMessage && (
          <p style={{ marginTop: 10, color: 'black' }}>{statusMessage}</p>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'auto 1px auto',
          gap: 30,
          alignItems: 'start',
        }}
      >
        {/* LEFT SIDE: USER INPUT CALENDAR */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, fit-content(100%))',
            gap: '30px 50px',
            alignItems: 'start',
          }}
        >
          {Object.entries(months).map(([monthName, monthDates]) => {
            const firstDay = monthDates[0].getDay();

            return (
              <section key={monthName}>
                <h2 style={{ marginBottom: 10 }}>{monthName}</h2>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 58px)',
                    gap: 3,
                  }}
                >
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(
                    (day) => (
                      <strong
                        key={day}
                        style={{
                          textAlign: 'center',
                          fontSize: 13,
                          fontWeight: 400
                        }}
                      >
                        {day}
                      </strong>
                    )
                  )}

                  {Array.from({ length: firstDay }).map((_, i) => (
                    <div key={`blank-${i}`} />
                  ))}

                  {monthDates.map((date) => {
                    const dateKey = formatDateKey(date);
                    const selected = selectedDates.includes(dateKey);

                    return (
                      <button
                        key={dateKey}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          startDrag(dateKey);
                        }}
                        onMouseEnter={() => dragOverDate(dateKey)}
                        style={{
                          height: 44,
                          border: '1px solid #999',
                          borderRadius: 8,
                          background: selected ? '#2D9B2B' : '#f8f8f8',
                          color: 'black',
                          cursor: 'pointer',
                          fontSize: 15,
                          userSelect: 'none'
                        }}
                      >
                        {date.getDate()}
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        {/* DIVIDER */}
        <div
          style={{
            width: 1,
            height: '100%',
            background: '#ddd',
          }}
        />

        {/* RIGHT SIDE: HEATMAP */}
        <aside>
          <h2 style={{fontSize: 20, fontWeight: 700, color: '#2D9B2B'}}> ALL AVAILABILITY</h2>
          <p style={{ marginTop: -5, marginBottom: 20 }}>
            *Hover over a date for a second to show availability*
          </p>

          {Object.entries(months).map(([monthName, monthDates]) => {
            const firstDay = monthDates[0].getDay();

            return (
              <section key={`heatmap-${monthName}`} style={{ marginBottom: 28 }}>
                <h3 style={{ marginBottom: 8 }}>{monthName}</h3>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 40px)',
                    gap: 3
                  }}
                >
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                    <strong
                      key={`${day}-${i}`}
                      style={{
                        textAlign: 'center',
                        fontSize: 11,
                        fontWeight: 400
                      }}
                    >
                      {day}
                    </strong>
                  ))}

                  {Array.from({ length: firstDay }).map((_, i) => (
                    <div key={`heat-blank-${i}`} />
                  ))}

                  {monthDates.map((date) => {
                    const dateKey = formatDateKey(date);
                    const availableNames = getAvailableNames(dateKey);
                    const unavailableNames = getUnavailableNames(dateKey);

                    return (
                      <button
                        key={`heat-${dateKey}`}
                        title={`Available: ${
                          availableNames.length
                            ? availableNames.join(', ')
                            : 'Nobody'
                        }\nUnavailable: ${
                          unavailableNames.length
                            ? unavailableNames.join(', ')
                            : 'Nobody'
                        }`}
                        style={{
                          height: 30,
                          width: 40,
                          border: '1px solid #aaa',
                          borderRadius: 5,
                          background: getHeatColor(dateKey),
                          color:
                            availableNames.length === responses.length &&
                            responses.length > 0
                              ? 'white'
                              : 'black',
                          cursor: 'default',
                          fontSize: 12,
                        }}
                      >
                        {date.getDate()}
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </aside>
      </div>
    </main>
  );
}