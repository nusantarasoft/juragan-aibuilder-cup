"use client";

export const dynamic = 'force-dynamic';

import React, { useState, Suspense } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { 
  ConfigProvider, 
  theme,
  Slider,
  Checkbox,
  Select,
  DatePicker,
  Popover
} from "antd";


const { Option } = Select;

import { 
  ArrowLeftOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  BankOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
  FilterOutlined,
  EnvironmentOutlined,
  MinusOutlined,
  PlusOutlined
} from "@ant-design/icons";
import dayjs from "dayjs";


const NUSANTARA_PORTS = [
  { value: "makassar", label: "Makassar (Paotere)" },
  { value: "labuan-bajo", label: "Labuan Bajo" },
  { value: "bali", label: "Bali (Sanur)" },
  { value: "lombok", label: "Lombok" },
  { value: "bunaken", label: "Bunaken Island" },
  { value: "raja-ampat", label: "Raja Ampat" },
  { value: "ambon", label: "Ambon" },
];

const MOCK_SCHEDULES = [
  {
    id: 1,
    departureTime: "08:00",
    arrivalTime: "12:30",
    duration: "4h 30m",
    price: 850000,
    vessel: "Oceanic Express V1",
    agency: "Bahari Fast Trans",
    class: "Executive Luxury",
    seatsLeft: 4,
    features: ["Starlink WiFi", "Leather VIP Seats"],
    isFast: true
  },
  {
    id: 2,
    departureTime: "10:15",
    arrivalTime: "15:00",
    duration: "4h 45m",
    price: 650000,
    vessel: "Komodo Dragon Speed",
    agency: "Labuan Bajo Cruisers",
    class: "Adventure Standard",
    seatsLeft: 12,
    features: ["Snorkeling Gear", "Sun Deck"],
    isFast: false
  },
  {
    id: 3,
    departureTime: "14:00",
    arrivalTime: "18:15",
    duration: "4h 15m",
    price: 950000,
    vessel: "Nusantara Voyager II",
    agency: "Sea Explorer Group",
    class: "Family Comfort Plus",
    seatsLeft: 2,
    features: ["Spacious Deck", "Pantry Onboard"],
    isFast: true
  }
];

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const fromParam = searchParams.get("from") || "makassar";
  const toParam = searchParams.get("to") || "labuan-bajo";
  
  const fromLabel = NUSANTARA_PORTS.find(p => p.value === fromParam)?.label || "Makassar";
  const toLabel = NUSANTARA_PORTS.find(p => p.value === toParam)?.label || "Labuan Bajo";

  const [priceRange, setPriceRange] = useState<[number, number]>([100000, 2000000]);
  const [searchDate, setSearchDate] = useState(dayjs().add(1, 'day'));
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);

  const updateSearchRoute = (newFrom: string, newTo: string) => {
    router.push(`/speedboat/search?from=${newFrom}&to=${newTo}`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-orange-500/30 font-sans pb-24">
      {/* Premium Header */}
      <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => router.back()}
              className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors border border-white/5"
            >
              <ArrowLeftOutlined className="text-white" />
            </button>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-[0.2em] text-orange-400 font-bold mb-0.5">Edit Search</span>
              <div className="flex items-center gap-1 text-lg font-black text-white">
                <Select
                  value={fromParam}
                  onChange={(val) => router.push(`/speedboat/search?from=${val}&to=${toParam}`)}
                  variant="borderless"
                  className="custom-inline-select min-w-[180px]"
                  popupClassName="custom-select-popup"
                >
                  {NUSANTARA_PORTS.map((p) => (
                    <Option key={p.value} value={p.value}>{p.label}</Option>
                  ))}
                </Select>
                
                <div className="h-[2px] w-4 bg-white/20 relative mx-2">
                   <div className="absolute top-1/2 left-full -translate-y-1/2 -translate-x-1.5 w-1.5 h-1.5 rounded-full bg-orange-400" />
                </div>

                <Select
                  value={toParam}
                  onChange={(val) => router.push(`/speedboat/search?from=${fromParam}&to=${val}`)}
                  variant="borderless"
                  className="custom-inline-select min-w-[180px]"
                  popupClassName="custom-select-popup"
                >
                  {NUSANTARA_PORTS.map((p) => (
                    <Option key={p.value} value={p.value}>{p.label}</Option>
                  ))}
                </Select>
              </div>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-4 text-sm font-medium">
             <div className="bg-white/5 border border-white/5 px-2 rounded-xl backdrop-blur-md flex items-center h-[38px]">
               <DatePicker 
                 className="custom-inline-datepicker"
                 variant="borderless"
                 value={searchDate}
                 onChange={(date) => date && setSearchDate(date)}
                 format="DD MMM YYYY"
                 allowClear={false}
               />
             </div>

             <Popover
                placement="bottomRight"
                trigger="click"
                color="#0f172a"
                overlayInnerStyle={{ padding: 0 }}
                content={
                  <div className="p-4 w-[280px] bg-slate-900 border border-white/10 rounded-2xl shadow-xl flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[14px] font-bold text-slate-200">Adults</span>
                        <span className="text-[10px] text-slate-500 leading-none">Age 12+</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-black/40 rounded-lg p-0.5 border border-white/5">
                        <button onClick={() => setAdults(Math.max(1, adults - 1))} className="h-7 w-7 flex justify-center items-center rounded-md hover:bg-white/10 text-orange-400">
                          <MinusOutlined className="text-[10px]" />
                        </button>
                        <span className="w-4 text-center text-sm font-bold text-white">{adults}</span>
                        <button onClick={() => setAdults(adults + 1)} className="h-7 w-7 flex justify-center items-center rounded-md hover:bg-white/10 text-orange-400">
                          <PlusOutlined className="text-[10px]" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[14px] font-bold text-slate-200">Children</span>
                        <span className="text-[10px] text-slate-500 leading-none">Age 2-11</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-black/40 rounded-lg p-0.5 border border-white/5">
                        <button onClick={() => setChildren(Math.max(0, children - 1))} className="h-7 w-7 flex justify-center items-center rounded-md hover:bg-white/10 text-orange-400">
                          <MinusOutlined className="text-[10px]" />
                        </button>
                        <span className="w-4 text-center text-sm font-bold text-white">{children}</span>
                        <button onClick={() => setChildren(children + 1)} className="h-7 w-7 flex justify-center items-center rounded-md hover:bg-white/10 text-orange-400">
                          <PlusOutlined className="text-[10px]" />
                        </button>
                      </div>
                    </div>
                  </div>
                }
             >
               <button className="bg-white/5 border border-white/5 px-4 h-[38px] rounded-xl backdrop-blur-md flex items-center gap-2 cursor-pointer hover:bg-white/10 transition-colors text-white">
                  <TeamOutlined className="text-orange-400"/> {adults + children} Passenger{(adults + children) > 1 && 's'}
               </button>
             </Popover>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-12">
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Sidebar Filters */}
          <aside className="w-full lg:w-[280px] flex-shrink-0">
            <div className="sticky top-28 space-y-8">
               <div className="flex items-center gap-2 text-white font-bold text-lg border-b border-white/5 pb-4">
                  <FilterOutlined className="text-orange-500" />
                  Filters
               </div>

               {/* Price Filter */}
               <div>
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Price Range</h3>
                  <Slider 
                    range 
                    value={priceRange} 
                    onChange={(val: any) => setPriceRange(val)}
                    min={0}
                    max={2000000}
                    step={50000}
                    className="custom-slider"
                  />
                  <div className="flex justify-between text-xs text-slate-500 mt-2 font-mono">
                     <span>IDR {(priceRange[0]/1000).toFixed(0)}k</span>
                     <span>IDR {(priceRange[1]/1000).toFixed(0)}k</span>
                  </div>
               </div>

               {/* Class Filter */}
               <div>
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Travel Class</h3>
                  <div className="flex flex-col gap-3 custom-checkbox-group">
                     <Checkbox className="custom-checkbox text-slate-300">Executive Luxury</Checkbox>
                     <Checkbox className="custom-checkbox text-slate-300">Family Comfort Plus</Checkbox>
                     <Checkbox className="custom-checkbox text-slate-300">Adventure Standard</Checkbox>
                  </div>
               </div>

               {/* Agency Filter */}
               <div>
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Managing Agency</h3>
                  <div className="flex flex-col gap-3 custom-checkbox-group">
                     <Checkbox className="custom-checkbox text-slate-300">Bahari Fast Trans</Checkbox>
                     <Checkbox className="custom-checkbox text-slate-300">Sea Explorer Group</Checkbox>
                     <Checkbox className="custom-checkbox text-slate-300">Labuan Bajo Cruisers</Checkbox>
                  </div>
               </div>
            </div>
          </aside>

          {/* Main Results Area */}
          <div className="flex-1 space-y-6">
            <div className="flex items-center justify-between mb-2">
               <h2 className="text-xl font-bold text-white">{MOCK_SCHEDULES.length} Schedules Available</h2>
               <div className="text-sm text-slate-500">Prices are per passenger, one-way.</div>
            </div>

            {MOCK_SCHEDULES.map((schedule, i) => (
              <motion.div 
                key={schedule.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ scale: 1.01 }}
                className="bg-black/20 border border-white/10 rounded-[2rem] p-6 md:p-8 backdrop-blur-xl relative overflow-hidden group hover:border-white/20 transition-all shadow-lg"
              >
                {/* Fast tag */}
                {schedule.isFast && (
                  <div className="absolute top-0 right-8 bg-orange-500 text-white text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-b-lg flex items-center gap-1 shadow-[0_0_15px_#f9731680]">
                    <ThunderboltOutlined /> Fastest
                  </div>
                )}

                <div className="flex flex-col md:flex-row gap-8 items-center justify-between">
                  
                  {/* Left: Timing & Route */}
                  <div className="flex items-center gap-6 md:gap-8 flex-1 w-full md:w-auto">
                    <div className="flex flex-col items-center">
                      <span className="text-3xl font-black text-white">{schedule.departureTime}</span>
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">{fromLabel.split(' ')[0]}</span>
                    </div>

                    <div className="flex-1 max-w-[150px] relative flex flex-col justify-center items-center">
                       <span className="text-xs text-orange-400 font-bold bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20 mb-2">
                         {schedule.duration}
                       </span>
                       <div className="w-full relative flex items-center">
                          <div className="w-2 h-2 rounded-full border-2 border-slate-600 bg-slate-900 z-10" />
                          <div className="h-[2px] flex-1 bg-slate-700 relative overflow-hidden">
                             <div className="absolute top-0 left-0 h-full w-full bg-orange-400 -translate-x-[100%] group-hover:translate-x-0 transition-transform duration-1000 ease-in-out" />
                          </div>
                          <div className="w-2 h-2 rounded-full border-2 border-orange-500 bg-slate-900 z-10" />
                       </div>
                    </div>

                    <div className="flex flex-col items-center">
                      <span className="text-3xl font-black text-white">{schedule.arrivalTime}</span>
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">{toLabel.split(' ')[0]}</span>
                    </div>
                  </div>

                  {/* Middle: Ship details */}
                  <div className="flex-1 w-full md:w-auto border-t md:border-t-0 md:border-l border-white/10 pt-6 md:pt-0 md:pl-8 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-2">
                       <div className="bg-white/10 border border-white/10 px-2 py-1 rounded-md text-[10px] text-white font-bold inline-block">
                         {schedule.class}
                       </div>
                       <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                          <BankOutlined /> {schedule.agency}
                       </div>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">{schedule.vessel}</h3>
                    <div className="flex flex-wrap gap-2">
                      {schedule.features.map((feat, idx) => (
                        <span key={idx} className="text-[10px] text-slate-400 flex items-center gap-1">
                           <SafetyCertificateOutlined className="text-orange-500/70" /> {feat}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Right: Pricing & CTA */}
                  <div className="w-full md:w-auto border-t md:border-t-0 md:border-l border-white/10 pt-6 md:pt-0 md:pl-8 flex flex-row md:flex-col items-center justify-between text-right md:min-w-[140px]">
                     <div className="flex flex-col items-start md:items-end">
                       <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1 w-full text-left md:text-right">Price</span>
                       <span className="text-2xl font-black text-orange-400">IDR {(schedule.price / 1000).toFixed(0)}k</span>
                       {schedule.seatsLeft <= 5 && (
                         <span className="text-xs text-red-400 mt-1 font-medium bg-red-400/10 px-2 py-0.5 rounded">Only {schedule.seatsLeft} seats left</span>
                       )}
                     </div>
                     <button 
                       onClick={() => router.push('/speedboat/checkout')}
                       className="h-12 px-6 rounded-xl bg-white text-black font-bold hover:bg-orange-500 hover:text-white hover:scale-105 active:scale-95 transition-all w-auto md:w-full md:mt-4 shadow-xl"
                     >
                       Select
                     </button>
                  </div>

                </div>
              </motion.div>
            ))}

          </div>
        </div>
      </main>

      <style jsx global>{`
        .custom-slider .ant-slider-rail {
          background-color: rgba(255, 255, 255, 0.1) !important;
        }
        .custom-slider .ant-slider-track {
          background-color: #f97316 !important;
        }
        .custom-slider .ant-slider-handle::after {
          box-shadow: 0 0 0 2px #f97316 !important;
        }
        .custom-checkbox-group .ant-checkbox-wrapper {
           margin-inline-start: 0 !important;
           align-items: center;
        }
        .custom-checkbox .ant-checkbox-inner {
          background: transparent !important;
          border-color: rgba(255,255,255,0.2) !important;
        }
        .custom-checkbox .ant-checkbox-checked .ant-checkbox-inner {
          background: #f97316 !important;
          border-color: #f97316 !important;
        }

        .custom-inline-select .ant-select-selector {
          padding: 0 8px !important;
          border-radius: 8px !important;
        }
        .custom-inline-select:hover .ant-select-selector {
          background-color: rgba(255, 255, 255, 0.05) !important;
        }
        .custom-inline-select .ant-select-selection-item {
          font-weight: 900 !important;
          font-size: 1.125rem !important; /* text-lg */
          color: white !important;
        }
        .custom-inline-select .ant-select-arrow {
          color: rgba(255,255,255,0.4) !important;
        }

        .custom-inline-datepicker input {
          color: white !important;
          font-weight: bold;
          text-align: center;
        }
        .custom-inline-datepicker .ant-picker-input > input::placeholder {
          color: rgba(255,255,255,0.7) !important;
        }
        .custom-inline-datepicker .ant-picker-in-active {
          border-color: #f97316 !important;
        }
        
        .custom-select-popup {
          background-color: #0f172a !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          border-radius: 12px !important;
        }
        .custom-select-popup .ant-select-item {
          color: rgba(255, 255, 255, 0.8) !important;
        }
        .custom-select-popup .ant-select-item-option-active {
          background-color: rgba(255, 255, 255, 0.05) !important;
        }
        .custom-select-popup .ant-select-item-option-selected {
          background-color: rgba(249, 115, 22, 0.2) !important;
          color: #f97316 !important;
          font-weight: bold;
        }
      `}</style>
    </div>
  );
}

export default function SearchPage() {
  return (
    <ConfigProvider theme={{ algorithm: theme.darkAlgorithm }}>
      <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-white font-mono text-xs">LOADING RADAR...</div>}>
         <SearchContent />
      </Suspense>
    </ConfigProvider>
  );
}
