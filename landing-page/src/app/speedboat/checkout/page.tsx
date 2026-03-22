"use client";

export const dynamic = 'force-dynamic';

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  ConfigProvider, 
  theme,
  Select,
  Input
} from "antd";
import { 
  ArrowLeftOutlined,
  ArrowRightOutlined,
  UserOutlined,
  IdcardOutlined,
  PhoneOutlined,
  MailOutlined,
  SafetyCertificateOutlined,
  CreditCardOutlined,
  LockOutlined,
  CheckCircleFilled
} from "@ant-design/icons";

const { Option } = Select;

export default function CheckoutPage() {
  const router = useRouter();

  // Mock Data
  const bookingDetails = {
    route: "Makassar (Paotere) to Labuan Bajo",
    date: "18 Mar 2026",
    departure: "08:00",
    arrival: "12:30",
    vessel: "Oceanic Express V1",
    class: "Executive Luxury",
    passengers: 1,
    baseFare: 850000,
    portTax: 25000,
    serviceFee: 15000
  };

  const total = bookingDetails.baseFare + bookingDetails.portTax + bookingDetails.serviceFee;

  return (
    <ConfigProvider theme={{ algorithm: theme.darkAlgorithm }}>
      <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-orange-500/30 font-sans pb-24">
        
        {/* Header */}
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
                <span className="text-[10px] uppercase tracking-[0.2em] text-orange-400 font-bold mb-0.5">Secure Checkout</span>
                <span className="text-lg font-black text-white">Passenger Details</span>
              </div>
            </div>
            
            <div className="hidden md:flex items-center gap-2 text-sm text-green-400 font-bold bg-green-400/10 px-4 py-2 rounded-full border border-green-400/20">
              <LockOutlined /> 256-bit Secure Encrypted
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 pt-12">
          <div className="flex flex-col lg:flex-row gap-10">
            
            {/* Left Column: Forms */}
            <div className="flex-1 space-y-10">
              
              {/* Contact Information */}
              <motion.section 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/5 border border-white/10 rounded-[2rem] p-8 md:p-10 backdrop-blur-xl"
              >
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-xl">
                    <MailOutlined />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-1">Contact Details</h2>
                    <p className="text-sm text-slate-400">Where should we send your e-ticket?</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 ml-1">Email Address</label>
                    <Input 
                      placeholder="e.g. name@example.com" 
                      className="checkout-input"
                      size="large"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 ml-1">Phone Number</label>
                    <Input 
                      placeholder="+62 812 3456 7890" 
                      className="checkout-input"
                      size="large"
                    />
                  </div>
                </div>
              </motion.section>

              {/* Passenger Details */}
              <motion.section 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white/5 border border-white/10 rounded-[2rem] p-8 md:p-10 backdrop-blur-xl"
              >
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xl">
                    <UserOutlined />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-1">Passenger 1 (Adult)</h2>
                    <p className="text-sm text-slate-400">Names must match your government ID or Passport.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  <div className="md:col-span-3 space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 ml-1">Title</label>
                    <Select defaultValue="mr" size="large" className="w-full custom-select" dropdownClassName="custom-select-popup">
                      <Option value="mr">Mr.</Option>
                      <Option value="mrs">Mrs.</Option>
                      <Option value="ms">Ms.</Option>
                    </Select>
                  </div>
                  <div className="md:col-span-4 space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 ml-1">First Name</label>
                    <Input placeholder="First Name" className="checkout-input" size="large" />
                  </div>
                  <div className="md:col-span-5 space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 ml-1">Last Name</label>
                    <Input placeholder="Last Name" className="checkout-input" size="large" />
                  </div>
                  
                  <div className="md:col-span-6 space-y-2 mt-2">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 ml-1">Nationality</label>
                    <Select defaultValue="id" size="large" className="w-full custom-select" dropdownClassName="custom-select-popup">
                      <Option value="id">Indonesia</Option>
                      <Option value="sg">Singapore</Option>
                      <Option value="au">Australia</Option>
                      <Option value="my">Malaysia</Option>
                      <Option value="other">Other...</Option>
                    </Select>
                  </div>
                  <div className="md:col-span-6 space-y-2 mt-2">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 ml-1 flex justify-between">
                      <span>Passport / ID Number</span>
                      <IdcardOutlined className="text-orange-400" />
                    </label>
                    <Input placeholder="Document Number" className="checkout-input" size="large" />
                  </div>
                </div>
              </motion.section>

            </div>

            {/* Right Column: Order Summary */}
            <div className="w-full lg:w-[400px] flex-shrink-0">
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="sticky top-28 bg-black/40 border border-white/10 rounded-[2rem] p-8 backdrop-blur-2xl shadow-2xl"
              >
                <div className="border-b border-white/10 pb-6 mb-6">
                  <h3 className="text-lg font-bold text-white mb-4">Trip Summary</h3>
                  <div className="bg-white/5 rounded-xl p-4 border border-white/5 mb-4">
                    <div className="text-[10px] text-orange-400 uppercase tracking-widest font-bold mb-2">Departing</div>
                    <div className="font-bold text-lg text-white mb-1">{bookingDetails.date}</div>
                    <div className="flex items-center justify-between text-slate-300 text-sm">
                      <span className="font-medium">{bookingDetails.departure}</span>
                      <div className="flex-1 h-[1px] bg-white/10 mx-3 relative">
                         <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-slate-500" />
                      </div>
                      <span className="font-medium">{bookingDetails.arrival}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-2 font-medium">{bookingDetails.route}</div>
                  </div>
                  
                  <div className="flex flex-col gap-2 text-sm text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Vessel</span>
                      <span className="font-bold">{bookingDetails.vessel}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Class</span>
                      <span className="font-bold text-orange-400">{bookingDetails.class}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Passengers</span>
                      <span className="font-bold">{bookingDetails.passengers} Adult</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 mb-8">
                  <h3 className="text-lg font-bold text-white mb-2">Price Details</h3>
                  <div className="flex justify-between text-slate-300 text-sm">
                    <span className="text-slate-500">Base Fare (x1)</span>
                    <span>IDR {bookingDetails.baseFare.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-300 text-sm">
                    <span className="text-slate-500">Port Tax</span>
                    <span>IDR {bookingDetails.portTax.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-300 text-sm">
                    <span className="text-slate-500">Service Fee</span>
                    <span>IDR {bookingDetails.serviceFee.toLocaleString()}</span>
                  </div>
                </div>

                <div className="border-t border-white/10 pt-6 mb-8 flex justify-between items-end">
                  <span className="text-slate-400 uppercase tracking-widest font-bold text-[11px]">Total Price</span>
                  <span className="text-3xl font-black text-white">IDR {total.toLocaleString()}</span>
                </div>

                <button className="w-full h-14 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-lg shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all">
                  Proceed to Payment <ArrowRightOutlined />
                </button>
                
                <div className="mt-6 flex items-start gap-3 bg-white/5 border border-white/5 rounded-xl p-4 text-xs text-slate-400 leading-relaxed">
                  <SafetyCertificateOutlined className="text-lg text-orange-400 mt-0.5" />
                  <p>By proceeding to payment, you agree to the Terms & Conditions and acknowledge our Cancellation Policy.</p>
                </div>
              </motion.div>
            </div>

          </div>
        </main>

        <style jsx global>{`
          .checkout-input {
            background-color: rgba(255, 255, 255, 0.05) !important;
            border-color: rgba(255, 255, 255, 0.1) !important;
            color: white !important;
            border-radius: 12px;
            box-shadow: none !important;
          }
          .checkout-input:hover, .checkout-input:focus {
            background-color: rgba(255, 255, 255, 0.08) !important;
            border-color: #f97316 !important;
          }
          .checkout-input::placeholder {
            color: rgba(255, 255, 255, 0.3) !important;
          }
          
          .custom-select .ant-select-selector {
            background-color: rgba(255, 255, 255, 0.05) !important;
            border-color: rgba(255, 255, 255, 0.1) !important;
            border-radius: 12px !important;
            color: white !important;
          }
          .custom-select:hover .ant-select-selector,
          .custom-select.ant-select-focused .ant-select-selector {
            border-color: #f97316 !important;
            background-color: rgba(255, 255, 255, 0.08) !important;
          }
          .custom-select .ant-select-arrow {
            color: rgba(255,255,255,0.5) !important;
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
    </ConfigProvider>
  );
}
