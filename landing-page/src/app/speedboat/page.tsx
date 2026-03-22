"use client";

export const dynamic = 'force-dynamic';

import React, { useState, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { 
  Button, 
  DatePicker, 
  Select, 
  ConfigProvider, 
  theme,
  Segmented,
  Checkbox,
  Popover,
  Slider
} from "antd";
import { 
  ArrowRightOutlined, 
  EnvironmentOutlined, 
  CalendarOutlined, 
  UserOutlined,
  CompassOutlined,
  SwapOutlined,
  CrownOutlined,
  MinusOutlined,
  PlusOutlined,
  CheckOutlined,
  TeamOutlined,
  RocketOutlined,
  CoffeeOutlined,
  TrophyOutlined,
  StarOutlined,
  SafetyOutlined,
  ContainerOutlined,
  SafetyCertificateOutlined,
  GlobalOutlined,
  CarOutlined,
  BankOutlined
} from "@ant-design/icons";
import dayjs from "dayjs";

const NUSANTARA_PORTS = [
  { value: "makassar", label: "Makassar (Paotere)", icon: "🌆" },
  { value: "labuan-bajo", label: "Labuan Bajo", icon: "🐉" },
  { value: "bali", label: "Bali (Sanur)", icon: "🛕" },
  { value: "lombok", label: "Lombok", icon: "🌋" },
  { value: "bunaken", label: "Bunaken Island", icon: "🐠" },
  { value: "raja-ampat", label: "Raja Ampat", icon: "🏝️" },
  { value: "ambon", label: "Ambon", icon: "⚓" },
];

export default function SpeedboatReservation() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [tripType, setTripType] = useState<any>("one-way");
  const [fromPort, setFromPort] = useState("makassar");
  const [toPort, setToPort] = useState("bunaken");
  const [isReturn, setIsReturn] = useState(false);
  
  // New States
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [selectedClasses, setSelectedClasses] = useState(["executive"]);

  const TRAVEL_CLASSES = [
    { label: 'Economy', value: 'economy', desc: 'Standard Seating', icon: <CoffeeOutlined /> },
    { label: 'Business', value: 'business', desc: 'Extra Comfort', icon: <StarOutlined /> },
    { label: 'Executive', value: 'executive', desc: 'Premium Perks', icon: <CrownOutlined /> },
  ];

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
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="mb-12 text-center"
          >
            {/* Premium Tag */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-8"
            >
              <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-orange-400">Nusantara Sea Explorer</span>
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-6xl md:text-8xl font-black text-white mb-6 tracking-tighter leading-[0.9]"
            >
              Unfold Your <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-500 to-red-600">
                Nusantara Story
              </span>
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto mb-12 leading-relaxed font-light"
            >
              From the historic docks of Paotere to the vibrant coral reefs of Bunaken. 
              Your premium transit between islands starts here with Indonesia's most trusted fleet.
            </motion.p>
          </motion.div>

          {/* Redesigned Booking Widget */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="group relative w-full max-w-7xl"
          >
            {/* Form Container */}
            <div className="relative overflow-hidden rounded-[2.5rem] border border-white/5 bg-black/15 p-1 md:p-3 backdrop-blur-[40px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)]">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
              
              {/* Form Content */}
              <div className="relative z-10 p-3 md:p-4">
                {/* Top Row: Type, Passengers, Class */}
                <div className="mb-4 flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                  {/* Left: Trip Type */}
                  <div className="w-full lg:w-auto">
                    <div className="flex flex-col gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 ml-1">Trip Type</span>
                      <Segmented
                        options={[
                          { label: 'One-way', value: 'one-way' },
                          { label: 'Round-trip', value: 'round-trip' },
                        ]}
                        value={tripType}
                        onChange={(val) => {
                          setTripType(val);
                          setIsReturn(val === 'round-trip');
                        }}
                        size="large"
                        className="rounded-full overflow-hidden w-full lg:w-auto bg-white/1 border-white/5 p-1 rounded-xl text-slate-300 custom-segmented"
                      />
                    </div>
                  </div>

                  {/* Right Side: Passengers & Class Grouped */}
                  <div className="flex flex-wrap items-start gap-6 lg:gap-8 justify-end">
                    {/* Passengers */}
                    <div className="flex flex-col gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 ml-1">Passengers</span>
                      <div className="flex items-center gap-3">
                        {/* Adults */}
                        <div className="rounded-2xl border border-white/5 bg-white/1 p-2 px-4 backdrop-blur-md flex flex-col gap-2 min-w-[260px]">
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                              <span className="text-[15px] font-bold text-slate-200">Adults</span>
                              <span className="text-[10px] text-slate-500 leading-none">Age 12+</span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-white/1 rounded-lg p-0.5 border border-white/5">
                              <button 
                                onClick={() => setAdults(Math.max(1, adults - 1))}
                                className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-white/10 text-orange-400 transition-colors"
                              >
                                <MinusOutlined className="text-[10px]" />
                              </button>
                              <span className="w-5 text-center text-[15px] font-bold">{adults}</span>
                              <button 
                                onClick={() => setAdults(adults + 1)}
                                className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-white/10 text-orange-400 transition-colors"
                              >
                                <PlusOutlined className="text-[10px]" />
                              </button>
                            </div>
                          </div>
                          <Slider 
                            min={1} 
                            max={10} 
                            value={adults} 
                            onChange={setAdults}
                            className="!m-0 !mt-0.5 w-full custom-slider"
                            tooltip={{ open: false }}
                          />
                        </div>

                        {/* Children */}
                        <div className="rounded-2xl border border-white/5 bg-white/1 p-2 px-4 backdrop-blur-md flex flex-col gap-2 min-w-[260px]">
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                              <span className="text-[15px] font-bold text-slate-200">Children</span>
                              <span className="text-[10px] text-slate-500 leading-none">Age 2-11</span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-white/1 rounded-lg p-0.5 border border-white/5">
                              <button 
                                onClick={() => setChildren(Math.max(0, children - 1))}
                                className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-white/10 text-orange-400 transition-colors"
                              >
                                <MinusOutlined className="text-[10px]" />
                              </button>
                              <span className="w-5 text-center text-[15px] font-bold">{children}</span>
                              <button 
                                onClick={() => setChildren(children + 1)}
                                className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-white/10 text-orange-400 transition-colors"
                              >
                                <PlusOutlined className="text-[10px]" />
                              </button>
                            </div>
                          </div>
                          <Slider 
                            min={0} 
                            max={10} 
                            value={children} 
                            onChange={setChildren}
                            className="!m-0 !mt-0.5 w-full custom-slider"
                            tooltip={{ open: false }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Class */}
                    <div className="flex flex-col gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 ml-1">Class</span>
                      <Popover 
                        trigger="click" 
                        placement="bottomRight"
                        overlayClassName="custom-popover"
                        content={
                          <div className="w-64 p-2 flex flex-col gap-2">
                            {TRAVEL_CLASSES.map((cls) => (
                              <button
                                key={cls.value}
                                onClick={() => {
                                  if (selectedClasses.includes(cls.value)) {
                                    if (selectedClasses.length > 1) {
                                      setSelectedClasses(selectedClasses.filter(c => c !== cls.value));
                                    }
                                  } else {
                                    setSelectedClasses([...selectedClasses, cls.value]);
                                  }
                                }}
                                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                                  selectedClasses.includes(cls.value)
                                    ? 'bg-orange-500/10 border-orange-500/50 text-orange-400'
                                    : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                                }`}
                              >
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 text-lg">
                                  {cls.icon}
                                </div>
                                <div className="text-left flex-1">
                                  <div className="text-sm font-bold">{cls.label}</div>
                                  <div className="text-[10px] opacity-60">{cls.desc}</div>
                                </div>
                                {selectedClasses.includes(cls.value) && <CheckOutlined className="text-xs" />}
                              </button>
                            ))}
                          </div>
                        }
                      >
                        <button className="h-[60px] w-[260px] flex items-center gap-3 px-3 rounded-2xl border border-white/5 bg-white/1 hover:bg-white/10 transition-colors group">
                          <CrownOutlined className="text-xl text-orange-400 flex-shrink-0" />
                          <div className="flex flex-col items-start overflow-hidden">
                            <span className="text-[14px] font-bold text-slate-200 truncate">
                              <span className="text-slate-500 font-medium mr-1.5">Class:</span>
                              {selectedClasses.length > 0 
                                ? selectedClasses.map(v => TRAVEL_CLASSES.find(c => c.value === v)?.label).join(", ")
                                : "Select Class"}
                            </span>
                          </div>
                        </button>
                      </Popover>
                    </div>
                  </div>
                </div>

                {/* Main Inputs Grid */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-end">
                  {/* From & To Section */}
                  <div className="lg:col-span-6 relative">
                    <div className="grid grid-cols-2 gap-0 mb-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-widest text-orange-400/80 ml-6">From</label>
                      <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 text-right mr-6">To</label>
                    </div>
                    <div className="grid grid-cols-2 gap-0 rounded-full bg-white shadow-sm relative h-[54px] overflow-hidden">
                      <div className="absolute left-1/2 top-0 h-full w-[1.5px] bg-slate-900 z-10 -translate-x-1/2" />
                      <div className="flex h-full items-center gap-2 pl-5 pr-5 relative z-0">
                        <EnvironmentOutlined className="text-base text-blue-500 flex-shrink-0" />
                        <Select
                          showSearch
                          placeholder="Select origin"
                          className="w-full text-lg custom-select-left"
                          popupClassName="custom-select-popup"
                          variant="borderless"
                          value={fromPort}
                          onChange={setFromPort}
                          options={NUSANTARA_PORTS}
                        />
                      </div>
                      <div className="flex h-full items-center justify-end gap-2 pr-5 pl-5 relative z-0">
                        <Select
                          showSearch
                          placeholder="Select destination port"
                          className="w-full !border-none !shadow-none custom-select-right"
                          popupClassName="custom-select-popup"
                          variant="borderless"
                          size="middle"
                          value={toPort}
                          onChange={setToPort}
                          options={NUSANTARA_PORTS}
                        />
                        <EnvironmentOutlined className="text-base text-slate-400 flex-shrink-0" />
                      </div>
                      <button 
                        onClick={handleSwap}
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex h-7 w-7 items-center justify-center rounded-full border border-slate-900 bg-white text-orange-500 shadow-md hover:scale-110 active:scale-95 transition-all"
                      >
                        <SwapOutlined className="text-[10px]" />
                      </button>
                    </div>
                  </div>

                  {/* Date Section */}
                  <div className="lg:col-span-5 relative">
                    <div className="grid grid-cols-2 gap-0 mb-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-widest text-orange-400/80 ml-6">Depart</label>
                      <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 text-right mr-6">Return</label>
                    </div>
                    <div className="grid grid-cols-2 gap-0 rounded-full bg-white shadow-sm relative h-[54px] overflow-hidden">
                      <div className="absolute left-1/2 top-0 h-full w-[1.5px] bg-slate-900 z-10 -translate-x-1/2" />
                      <div className="flex h-full items-center gap-1.5 pl-4 pr-4 relative z-0">
                        <CalendarOutlined className="text-sm text-blue-500 flex-shrink-0" />
                        <DatePicker 
                          className="w-full !border-none custom-datepicker" 
                          variant="borderless" 
                          size="middle"
                          defaultValue={dayjs().add(1, 'day')}
                          format="DD MMM YYYY"
                          popupClassName="custom-datepicker-popup"
                        />
                      </div>
                      <div className={`flex h-full items-center justify-end gap-1.5 pr-4 pl-4 relative z-0 transition-opacity duration-300 ${!isReturn ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                        <DatePicker 
                          className="w-full !border-none custom-datepicker-right" 
                          variant="borderless" 
                          size="middle"
                          format="DD MMM YYYY"
                          placeholder="Ret"
                          popupClassName="custom-datepicker-popup"
                        />
                        <CalendarOutlined className="text-sm text-slate-400 flex-shrink-0" />
                      </div>
                    </div>
                  </div>

                  {/* Search Button */}
                  <div className="lg:col-span-1">
                    <Button 
                      type="primary" 
                      size="large"
                      onClick={() => router.push(`/speedboat/search?from=${fromPort}&to=${toPort}`)}
                      className="!h-[54px] !w-full !rounded-2xl !bg-orange-500 hover:!bg-orange-600 border-none shadow-lg shadow-orange-500/20"
                      icon={<ArrowRightOutlined className="text-xl" />}
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Featured Ship Section */}
        <section className="py-24 px-6 md:px-12 bg-slate-950 relative">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
              <div>
                <span className="text-orange-500 font-bold uppercase tracking-[0.2em] text-[10px] mb-4 block">Fleet Showcase</span>
                <h2 className="text-4xl md:text-5xl font-black text-white">Our Featured Vessels</h2>
              </div>
              <p className="text-slate-400 max-w-md md:text-right">Experience the pinnacle of marine engineering with our curated selection of luxury speedboats.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  name: "Oceanic Express V1",
                  agency: "Bahari Fast Trans",
                  class: "Executive Luxury",
                  capacity: "24 Passengers",
                  speed: "45 Knots",
                  image: "/images/luxury_speedboat.png",
                  features: ["Starlink WiFi", "Leather VIP Seats", "Climate Control"]
                },
                {
                  name: "Nusantara Voyager II",
                  agency: "Sea Explorer Group",
                  class: "Family Comfort Plus",
                  capacity: "32 Passengers",
                  speed: "38 Knots",
                  image: "/images/luxury_speedboat.png",
                  features: ["Spacious Deck", "Pantry Onboard", "Quiet Engine"]
                },
                {
                  name: "Komodo Dragon Speed",
                  agency: "Labuan Bajo Cruisers",
                  class: "Adventure Standard",
                  capacity: "40 Passengers",
                  speed: "35 Knots",
                  image: "/images/luxury_speedboat.png",
                  features: ["Snorkeling Gear", "Sun Deck", "Refreshments"]
                }
              ].map((ship, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="group relative h-[500px] rounded-[3rem] overflow-hidden border border-white/10 bg-white/5"
                >
                  <motion.div 
                    className="absolute inset-0 z-0"
                    whileHover={{ scale: 1.1 }}
                    transition={{ duration: 0.8 }}
                  >
                    <Image 
                      src={ship.image} 
                      alt={ship.name}
                      fill
                      className="object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-700"
                    />
                  </motion.div>
                  
                  <div className="absolute inset-0 z-10 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                  
                  <div className="absolute inset-x-8 bottom-8 z-20">
                    <div className="flex justify-between items-end">
                      <div>
                        <div className="flex gap-2 mb-4">
                          <div className="bg-orange-500 text-white text-[10px] font-bold px-3 py-1 rounded-full w-fit">
                            {ship.class}
                          </div>
                          <div className="bg-black/50 backdrop-blur-md text-white/80 text-[10px] font-bold px-3 py-1 rounded-full w-fit flex items-center gap-1 border border-white/10">
                            <BankOutlined /> {ship.agency}
                          </div>
                        </div>
                        <h3 className="text-3xl font-black text-white mb-2">{ship.name}</h3>
                        <div className="flex gap-4 text-slate-300 text-sm mb-6">
                          <span className="flex items-center gap-1.5"><TeamOutlined className="text-orange-400" /> {ship.capacity}</span>
                          <span className="flex items-center gap-1.5"><RocketOutlined className="text-orange-400" /> {ship.speed}</span>
                        </div>
                        <div className="flex gap-2">
                          {ship.features.map((f, j) => (
                            <span key={j} className="text-[10px] px-3 py-1 bg-white/1 rounded-full border border-white/5 text-slate-400">
                              {f}
                            </span>
                          ))}
                        </div>
                      </div>
                      <motion.button 
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center hover:bg-orange-500 hover:text-white transition-colors"
                      >
                        <ArrowRightOutlined className="text-xl" />
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Content Section (Advantages) */}
        <section className="py-24 px-6 md:px-12 bg-slate-950 relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-20">
              <h2 className="text-4xl md:text-5xl font-black text-white mb-4">The Nusantara Advantage</h2>
              <p className="text-slate-400 max-w-2xl mx-auto">Elevate your island travel with our premium services designed for maximum comfort and speed.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { 
                  icon: <ContainerOutlined className="text-3xl" />, 
                  title: "Direct Port Access", 
                  desc: "Connect seamlessly between primary Nusantara hubs with high-frequency schedules and dedicated VIP docking lanes." 
                },
                { 
                  icon: <SafetyCertificateOutlined className="text-3xl" />, 
                  title: "Executive Comfort", 
                  desc: "Enjoy spacious reclining leather seating, individual climate control, and complimentary premium snack boxes on every voyage." 
                },
                { 
                  icon: <GlobalOutlined className="text-3xl" />, 
                  title: "Safety Excellence", 
                  desc: "Modern vessels equipped with latest satellite navigation, redundant safety systems, and professionally certified master crew." 
                }
              ].map((feature, i) => (
                <motion.div 
                  key={i}
                  whileHover={{ y: -10 }}
                  className="bg-white/5 border border-white/10 p-10 rounded-[2rem] backdrop-blur-xl group hover:bg-white/10 transition-all duration-500"
                >
                  <div className="w-16 h-16 rounded-2xl bg-orange-500/20 flex items-center justify-center text-orange-400 mb-8 group-hover:bg-orange-500 group-hover:text-white transition-colors duration-500">
                    {feature.icon}
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">{feature.title}</h3>
                  <p className="text-slate-400 leading-relaxed font-light">{feature.desc}</p>
                </motion.div>
              ))}
            </div>

            {/* Popular Routes Section */}
            <div className="mt-40">
              <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
                <div>
                  <h2 className="text-4xl md:text-5xl font-black text-white mb-4">Popular Routes</h2>
                  <p className="text-slate-400">Discover the most traveled connections across the archipelago.</p>
                </div>
                <button 
                  onClick={() => router.push('/speedboat/search')}
                  className="px-8 py-3 rounded-full border border-white/10 text-white hover:bg-white hover:text-black transition-all font-bold group"
                >
                  View All Routes <ArrowRightOutlined className="ml-2 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { from: "Makassar", to: "Labuan Bajo", price: "850k", duration: "4h 30m" },
                  { from: "Bunaken", to: "Manado", price: "120k", duration: "45m" },
                  { from: "Bali", to: "Lombok", price: "450k", duration: "2h 15m" },
                  { from: "Ambon", to: "Banda", price: "650k", duration: "6h 00m" }
                ].map((route, i) => (
                  <motion.div 
                    key={i}
                    whileHover={{ scale: 1.02 }}
                    className="relative p-8 rounded-[2.5rem] bg-white/5 border border-white/10 cursor-pointer overflow-hidden group"
                  >
                    <div className="flex justify-between items-start mb-10">
                      <div className="bg-orange-500/20 text-orange-400 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
                        {route.duration}
                      </div>
                      <div className="text-white font-bold text-xl">IDR {route.price}</div>
                    </div>

                    <div className="flex items-center gap-4 text-white hover:text-orange-400 transition-colors">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">From</span>
                        <span className="text-lg font-bold">{route.from}</span>
                      </div>
                      <div className="h-[1px] flex-grow bg-white/20 relative">
                        <motion.div 
                          initial={{ left: 0 }}
                          animate={{ left: "100%" }}
                          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                          className="absolute -top-[2px] w-1.5 h-1.5 rounded-full bg-orange-400 shadow-[0_0_8px_#fb923c]"
                        />
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">To</span>
                        <span className="text-lg font-bold">{route.to}</span>
                      </div>
                    </div>
                    
                    <div className="absolute inset-x-0 bottom-0 h-1.5 bg-gradient-to-r from-orange-500 to-red-600 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500" />
                  </motion.div>
                ))}
              </div>
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
          <p className="text-slate-500 text-xs">© 2026 Nusantara Sea Explorer by Nusantarasoft. All rights reserved.</p>
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
          .custom-select .ant-select-selection-item,
          .custom-select .ant-select-selection-placeholder {
            text-align: left !important;
          }
          .custom-select-right .ant-select-selector {
            justify-content: flex-end !important;
          }
          .custom-select-right .ant-select-selection-item,
          .custom-select-right .ant-select-selection-placeholder {
            text-align: right !important;
            width: 100% !important;
            padding-right: 0 !important;
          }
          .custom-select-right .ant-select-selection-search {
            right: 0 !important;
            left: auto !important;
          }
          .custom-select-right .ant-select-selection-search-input {
            text-align: right !important;
          }
          
          /* Enforce dark text on the white booking form inputs */
          .custom-select-left,
          .custom-select-right,
          .custom-select-left .ant-select-selection-item,
          .custom-select-left .ant-select-selection-placeholder,
          .custom-select-left .ant-select-selection-search-input,
          .custom-select-right .ant-select-selection-item,
          .custom-select-right .ant-select-selection-placeholder,
          .custom-select-right .ant-select-selection-search-input {
             color: #1e293b !important;
          }
          
          .custom-select-left .ant-select-selection-placeholder,
          .custom-select-right .ant-select-selection-placeholder {
             color: #94a3b8 !important;
          }

          .custom-datepicker-right input,
          .custom-datepicker input {
             color: #1e293b !important;
          }
          
          .custom-datepicker-right input::placeholder,
          .custom-datepicker input::placeholder {
             color: #94a3b8 !important;
          }

          .custom-datepicker-right input {
            text-align: right !important;
            font-size: 13px !important;
          }
          .custom-datepicker input {
            text-align: left !important;
            font-size: 15px !important;
          }
          .custom-select-left .ant-select-selection-item,
          .custom-select-right .ant-select-selection-item {
            font-size: 15px !important;
          }
          .custom-slider .ant-slider-rail {
            background-color: rgba(255, 255, 255, 0.1) !important;
          }
          .custom-slider .ant-slider-track {
            background-color: #f97316 !important;
          }
          .custom-slider .ant-slider-handle::after {
            box-shadow: 0 0 0 2px #f97316 !important;
          }
          .custom-popover .ant-popover-inner {
            background: #0f172a !important; /* slate-900 */
            border: 1px solid rgba(255, 255, 255, 0.1);
            padding: 8px !important;
            border-radius: 20px;
            box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.5);
          }
          .custom-popover .ant-popover-arrow::before {
            background: #0f172a !important;
          }
        `}</style>
      </div>
    </ConfigProvider>
  );
}
