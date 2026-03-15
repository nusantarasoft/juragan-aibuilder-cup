"use client";

export const dynamic = 'force-dynamic';

import React, { useState, useRef } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { 
  Button, 
  DatePicker, 
  Select, 
  ConfigProvider, 
  theme,
  Segmented,
  Checkbox
} from "antd";
import { 
  ArrowRightOutlined, 
  EnvironmentOutlined, 
  CalendarOutlined, 
  UserOutlined,
  CompassOutlined,
  SwapOutlined,
  CrownOutlined
} from "@ant-design/icons";
import dayjs from "dayjs";

const SULAWESI_PORTS = [
  { value: "makassar", label: "Makassar (Paotere)", icon: "🌆" },
  { value: "manado", label: "Manado", icon: "🌋" },
  { value: "bunaken", label: "Bunaken Island", icon: "🐠" },
  { value: "bitung", label: "Bitung", icon: "⚓" },
  { value: "bau-bau", label: "Bau-Bau (Buton)", icon: "🏰" },
  { value: "luwuk", label: "Luwuk", icon: "🏝️" },
  { value: "gorontalo", label: "Gorontalo", icon: "🐋" },
];

export default function SpeedboatReservation() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tripType, setTripType] = useState<any>("one-way");
  const [fromPort, setFromPort] = useState("makassar");
  const [toPort, setToPort] = useState("bunaken");
  const [isReturn, setIsReturn] = useState(false);

  // Parallax setup
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "40%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.4], [1, 0]);

  const handleSwap = () => {
    const temp = fromPort;
    setFromPort(toPort);
    setToPort(temp);
  };

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: "#f97316", // Orange
          borderRadius: 16,
          colorBgContainer: "rgba(255, 255, 255, 0.05)",
        },
        components: {
          Segmented: {
            itemSelectedBg: "#f97316",
            itemSelectedColor: "#fff",
            trackBg: "rgba(255, 255, 255, 0.1)",
          },
          Select: {
            selectorBg: "#fff",
            colorText: "#1e293b",
            colorTextPlaceholder: "#94a3b8",
          },
          DatePicker: {
            colorBgContainer: "#fff",
            colorText: "#1e293b",
            colorTextPlaceholder: "#94a3b8",
          }
        }
      }}
    >
      <div 
        ref={containerRef}
        className="relative min-h-[150vh] w-full overflow-hidden bg-slate-950 font-sans text-white selection:bg-orange-500/30"
      >
        {/* Parallax Background */}
        <motion.div 
          style={{ y: backgroundY }}
          className="fixed inset-0 z-0 h-screen w-full"
        >
          <div className="absolute inset-0 z-10 bg-gradient-to-b from-slate-950/40 via-transparent to-slate-950" />
          <Image
            src="/island-bg.png"
            alt="Tropical Island"
            fill
            priority
            className="object-cover"
          />
        </motion.div>

        {/* Hero & Form Section */}
        <section className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 pb-20 pt-32">
          {/* Hero Text */}
          <motion.div
            style={{ opacity: heroOpacity }}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="mb-12 text-center"
          >
            <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-orange-400 backdrop-blur-xl border border-white/10">
              <CompassOutlined className="animate-pulse" /> Sulawesi Sea Explorer
            </span>
            <h1 className="mb-4 text-5xl font-black tracking-tighter md:text-8xl">
              Unfold Your <br />
              <span className="bg-gradient-to-br from-orange-400 via-yellow-400 to-orange-600 bg-clip-text text-transparent">
                Sulawesi Story
              </span>
            </h1>
            <p className="mx-auto max-w-xl text-balance text-lg text-slate-200/80 md:text-xl">
              From the historic docks of Paotere to the vibrant coral reefs of Bunaken. 
              Your premium transit between islands starts here.
            </p>
          </motion.div>

          {/* Redesigned Booking Widget */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="group relative w-full max-w-6xl"
          >
            {/* Form Container */}
            <div className="relative overflow-hidden rounded-[2.5rem] border border-white/20 bg-black/40 p-1 md:p-3 backdrop-blur-3xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)]">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
              
              {/* Form Content */}
              <div className="relative z-10 p-6 md:p-10">
                {/* Top Row: Type, Passengers, Class */}
                <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                  <div className="flex flex-wrap items-center gap-4">
                    <Segmented
                      options={[
                        { label: 'One-way / Round-trip', value: 'one-way' },
                        // { label: 'Multi-city', value: 'multi-city' }, // Removed per feedback
                      ]}
                      value={tripType}
                      onChange={setTripType}
                      size="large"
                      className="rounded-full overflow-hidden"
                    />
                  </div>

                  <div className="flex items-center gap-4">
                    <button className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 pl-4 pr-5 py-2.5 hover:bg-white/10 transition-colors group">
                      <UserOutlined className="text-orange-400 group-hover:scale-110 transition-transform" />
                      <div className="flex flex-col items-start leading-none">
                        <span className="text-[9px] uppercase tracking-tighter text-slate-500 font-bold mb-0.5">Passengers</span>
                        <span className="text-sm font-medium text-slate-200">1 Adult, 0 Child</span>
                      </div>
                    </button>
                    <button className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 pl-4 pr-5 py-2.5 hover:bg-white/10 transition-colors group">
                      <CrownOutlined className="text-orange-400 group-hover:scale-110 transition-transform" />
                      <div className="flex flex-col items-start leading-none">
                        <span className="text-[9px] uppercase tracking-tighter text-slate-500 font-bold mb-0.5">Travel Class</span>
                        <span className="text-sm font-medium text-slate-200">Executive Class</span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Main Inputs Grid */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-end">
                  
                  {/* From & To Section */}
                  <div className="lg:col-span-5 relative">
                    <div className="grid grid-cols-2 gap-0 mb-2">
                      <label className="text-[11px] font-bold uppercase tracking-widest text-orange-400/80 ml-8">From</label>
                      <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 ml-12">To</label>
                    </div>
                    <div className="grid grid-cols-2 gap-0 rounded-full bg-white px-3 shadow-sm relative h-[60px] items-center">
                      <div className="flex items-center gap-2 pl-4">
                        <EnvironmentOutlined className="text-lg text-blue-500 flex-shrink-0" />
                        <Select
                          showSearch
                          placeholder="Origin Port"
                          className="w-full !border-none !shadow-none custom-select"
                          variant="borderless"
                          size="large"
                          value={fromPort}
                          onChange={setFromPort}
                          options={SULAWESI_PORTS}
                        />
                      </div>
                      
                      <div className="flex items-center gap-2 pr-4 border-l-4 border-slate-200">
                        <EnvironmentOutlined className="ml-4 text-lg text-slate-400 flex-shrink-0" />
                        <Select
                          showSearch
                          placeholder="Destination"
                          className="w-full !border-none !shadow-none custom-select"
                          variant="borderless"
                          size="large"
                          value={toPort}
                          onChange={setToPort}
                          options={SULAWESI_PORTS}
                        />
                      </div>

                      {/* Swap Button */}
                      <button 
                        onClick={handleSwap}
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex h-9 w-9 items-center justify-center rounded-full border-2 border-slate-900 bg-white text-orange-500 shadow-lg hover:scale-110 active:scale-95 transition-all"
                      >
                        <SwapOutlined className="text-base" />
                      </button>
                    </div>
                  </div>

                  {/* Date Section */}
                  <div className="lg:col-span-12 xl:col-span-6 relative">
                    <div className="grid grid-cols-2 gap-0 mb-2">
                      <label className="text-[11px] font-bold uppercase tracking-widest text-orange-400/80 ml-8">Departure Date</label>
                      <div className="flex items-center justify-between ml-12 pr-8">
                        <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Return Date</label>
                        <Checkbox 
                          checked={isReturn} 
                          onChange={(e) => setIsReturn(e.target.checked)}
                          className="text-white custom-checkbox"
                        >
                          <span className="text-[10px] text-slate-300">ADD</span>
                        </Checkbox>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-0 rounded-full bg-white px-3 shadow-sm h-[60px] items-center">
                      <div className="flex items-center gap-2 pl-4">
                        <CalendarOutlined className="text-lg text-blue-500 flex-shrink-0" />
                        <DatePicker 
                          className="w-full !border-none custom-datepicker" 
                          variant="borderless" 
                          size="large"
                          defaultValue={dayjs().add(1, 'day')}
                          format="DD MMM YYYY"
                        />
                      </div>
                      
                      <div className={`flex items-center gap-2 pr-4 border-l-4 border-slate-200 transition-opacity duration-300 ${!isReturn ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                        <CalendarOutlined className="ml-4 text-lg text-slate-400 flex-shrink-0" />
                        <DatePicker 
                          className="w-full !border-none custom-datepicker" 
                          variant="borderless" 
                          size="large"
                          format="DD MMM YYYY"
                          placeholder="Add Return"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Search Button */}
                  <div className="lg:col-span-12 xl:col-span-1 flex justify-center xl:justify-end">
                    <Button 
                      type="primary" 
                      size="large"
                      className="!h-[60px] !w-full xl:!w-full !rounded-full !bg-orange-500 hover:!bg-orange-600 border-none shadow-xl shadow-orange-500/20"
                      icon={<ArrowRightOutlined className="text-xl" />}
                    />
                  </div>

                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Features Preview */}
        <section className="relative z-10 w-full bg-slate-950 px-6 py-32">
          <div className="mx-auto max-w-7xl">
            <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
              {[
                {
                  title: "Direct Port Access",
                  desc: "Connect seamlessly between primary Sulawesi hubs with high-frequency schedules.",
                  icon: "⚓"
                },
                {
                  title: "Executive Comfort",
                  desc: "Enjoy spacious seating, air conditioning, and premium snacks on every voyage.",
                  icon: "🛋️"
                },
                {
                  title: "Safety First",
                  desc: "Modern vessels equipped with latest navigation and safety technology.",
                  icon: "🛡️"
                }
              ].map((item, i) => (
                <div 
                  key={i}
                  className="rounded-[2rem] border border-white/5 bg-white/[0.02] p-10 transition-all hover:bg-white/[0.04] hover:-translate-y-2 duration-300"
                >
                  <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500/10 text-4xl border border-orange-500/20">{item.icon}</div>
                  <h3 className="mb-3 text-2xl font-bold">{item.title}</h3>
                  <p className="leading-relaxed text-slate-400">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="relative z-10 border-t border-white/5 bg-slate-950/80 py-16 text-center backdrop-blur-md">
          <div className="flex justify-center gap-8 mb-8 text-slate-400 text-sm">
             <a href="#" className="hover:text-orange-400 transition-colors">About Us</a>
             <a href="#" className="hover:text-orange-400 transition-colors">Term of Service</a>
             <a href="#" className="hover:text-orange-400 transition-colors">Privacy Policy</a>
             <a href="#" className="hover:text-orange-400 transition-colors">Contact</a>
          </div>
          <p className="text-slate-500 text-xs">© 2026 Sulawesi Sea Explorer by Nusantarasoft. All rights reserved.</p>
        </footer>

        <style jsx global>{`
          .ant-segmented {
            background: rgba(255, 255, 255, 0.05) !important;
          }
          .ant-segmented-item-selected {
            background: #f97316 !important;
          }
          .custom-checkbox .ant-checkbox-inner {
            background: transparent !important;
            border-color: rgba(255,255,255,0.2) !important;
          }
          .custom-checkbox .ant-checkbox-checked .ant-checkbox-inner {
            background: #f97316 !important;
            border-color: #f97316 !important;
          }
          /* Force light text in popups since they are dark themed */
          .ant-select-dropdown .ant-select-item-option-content,
          .ant-select-dropdown .ant-select-item-option-selected,
          .ant-picker-dropdown .ant-picker-content,
          .ant-picker-dropdown .ant-picker-header {
            color: rgba(255, 255, 255, 0.85) !important;
          }
          .ant-select-dropdown .ant-select-item-option-selected {
             background-color: rgba(249, 115, 22, 0.2) !important;
          }
        `}</style>
      </div>
    </ConfigProvider>
  );
}
