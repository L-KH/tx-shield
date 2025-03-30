'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Shield, Activity, Zap, ArrowRight, ExternalLink, Lock } from 'lucide-react';
import TransactionAnalyzer from './TransactionAnalyzer';

export default function HomePage() {
  const [showFullAnalyzer, setShowFullAnalyzer] = useState(false);
  
  return (
    <main className="min-h-screen bg-gray-900 text-white">
      {showFullAnalyzer ? (
        <TransactionAnalyzer />
      ) : (
        <div className="px-4 py-12 max-w-7xl mx-auto">
          {/* Hero Section */}
          <section className="text-center mb-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex justify-center mb-6"
            >
              <div className="bg-blue-600 p-4 rounded-full">
                <Shield size={48} />
              </div>
            </motion.div>
            
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl md:text-6xl font-bold mb-6"
            >
              TX Shield
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-xl text-gray-300 max-w-3xl mx-auto mb-10"
            >
              Advanced protection for your DeFi transactions with 
              AI-powered threat detection, MEV protection, and secure alternatives.
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row justify-center gap-4"
            >
              <button
                onClick={() => setShowFullAnalyzer(true)}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-lg font-medium flex items-center justify-center"
              >
                Analyze Transaction
                <ArrowRight className="ml-2" size={20} />
              </button>
              
              <a
                href="#features"
                className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-lg font-medium"
              >
                Learn More
              </a>
            </motion.div>
          </section>
          
          {/* Key Stats */}
          {/* <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20 max-w-4xl mx-auto"
          >
            <div className="bg-gray-800 p-6 rounded-lg text-center">
              <div className="text-4xl font-bold text-blue-500 mb-2">$12.8M+</div>
              <div className="text-gray-400">Protected Value</div>
            </div>
            
            <div className="bg-gray-800 p-6 rounded-lg text-center">
              <div className="text-4xl font-bold text-green-500 mb-2">1,285+</div>
              <div className="text-gray-400">Scams Detected</div>
            </div>
            
            <div className="bg-gray-800 p-6 rounded-lg text-center">
              <div className="text-4xl font-bold text-purple-500 mb-2">128.5 ETH</div>
              <div className="text-gray-400">MEV Saved</div>
            </div>
          </motion.section> */}
          
          {/* Features */}
          <section id="features" className="mb-20">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="text-3xl font-bold text-center mb-12"
            >
              Key Features
            </motion.h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                className="bg-gray-800 p-6 rounded-lg"
              >
                <div className="bg-blue-600 p-3 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                  <Shield size={24} />
                </div>
                <h3 className="text-xl font-bold mb-3">AI Threat Detection</h3>
                <p className="text-gray-400">
                  Advanced machine learning models identify malicious transactions, 
                  phishing attempts, and suspicious contract behavior.
                </p>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.7 }}
                className="bg-gray-800 p-6 rounded-lg"
              >
                <div className="bg-green-600 p-3 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                  <Activity size={24} />
                </div>
                <h3 className="text-xl font-bold mb-3">Transaction Simulation</h3>
                <p className="text-gray-400">
                  Visualize the exact impact of your transaction before sending, 
                  including token transfers, slippage, and potential errors.
                </p>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.8 }}
                className="bg-gray-800 p-6 rounded-lg"
              >
                <div className="bg-purple-600 p-3 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                  <Zap size={24} />
                </div>
                <h3 className="text-xl font-bold mb-3">MEV Protection</h3>
                <p className="text-gray-400">
                  Safeguard your transactions from sandwich attacks, frontrunning, 
                  and other MEV exploits with private transaction options.
                </p>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.9 }}
                className="bg-gray-800 p-6 rounded-lg"
              >
                <div className="bg-red-600 p-3 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                  <Lock size={24} />
                </div>
                <h3 className="text-xl font-bold mb-3">Secure Smart Contracts</h3>
                <p className="text-gray-400">
                  Execute transactions through our audited smart contracts that add 
                  additional safety checks and protections.
                </p>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 1.0 }}
                className="bg-gray-800 p-6 rounded-lg"
              >
                <div className="bg-yellow-600 p-3 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                  <ExternalLink size={24} />
                </div>
                <h3 className="text-xl font-bold mb-3">Safe Alternatives</h3>
                <p className="text-gray-400">
                  Get intelligent suggestions for safer transaction alternatives,
                  like limited token approvals and optimized swap routes.
                </p>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 1.1 }}
                className="bg-gray-800 p-6 rounded-lg"
              >
                <div className="bg-orange-600 p-3 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                  <Activity size={24} />
                </div>
                <h3 className="text-xl font-bold mb-3">Multi-Chain Support</h3>
                <p className="text-gray-400">
                  Protect your transactions across Ethereum, Linea, Sepolia, 
                  and other major EVM chains. [Soon]
                </p>
              </motion.div>
            </div>
          </section>
          
          {/* CTA */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1.2 }}
            className="text-center mb-20"
          >
            <div className="bg-gray-800 p-8 rounded-lg max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold mb-4">Ready to secure your transactions?</h2>
              <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
                Start using TX Shield today to protect your DeFi transactions from scams, 
                hacks, and exploits with our advanced security features.
              </p>
              
              <button
                onClick={() => setShowFullAnalyzer(true)}
                className="px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-lg text-lg font-medium transition-colors"
              >
                Try TX Shield Now
              </button>
            </div>
          </motion.section>
          
          {/* Footer */}
          <footer className="border-t border-gray-800 pt-8 text-center text-gray-500 text-sm">
            <div className="flex justify-center space-x-6 mb-4">
              <a href="#" className="hover:text-white transition-colors">Twitter</a>
              <a href="#" className="hover:text-white transition-colors">GitHub</a>
              <a href="#" className="hover:text-white transition-colors">Discord</a>
              <a href="#" className="hover:text-white transition-colors">Documentation</a>
            </div>
            <p>© 2025 TX Shield. All rights reserved.</p>
          </footer>
        </div>
      )}
    </main>
  );
}