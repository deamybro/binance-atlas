import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { LayoutDashboard, GitGraph, Target, Shield, AlertTriangle, Briefcase, Microscope, Cpu, BookOpen, Settings } from "lucide-react";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "ATLAS | Autonomous Capital & Cascade Intelligence",
  description: "Autonomous Capital Allocation and Cascade Intelligence Engine for Binance Agent OS",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#0a0e17] text-[#e2e8f0]">
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-1.5 flex justify-between items-center text-xs font-mono text-amber-400 tracking-wider z-50">
          <span>ATLAS ENGINE: ONLINE | AGENT OS MCP INTEGRATED</span>
          <span className="font-bold">MODE: PAPER EXECUTION (SIMULATED BALANCES)</span>
          <span>DETERMINISTIC RISK REFEREE: ACTIVE</span>
        </div>
        
        <div className="flex flex-1 overflow-hidden h-[calc(100vh-33px)]">
          {/* Sidebar */}
          <aside className="w-64 bg-[#0a0e17] border-r border-[#1e293b] flex flex-col">
            <div className="p-5 border-b border-[#1e293b]">
              <h1 className="text-xl font-bold tracking-tighter flex items-center gap-2 text-white">
                <span className="text-emerald-400">A</span>TLAS
              </h1>
              <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-wider font-mono">
                Cascade Intelligence Engine
              </p>
            </div>
            
            <nav className="flex-1 py-3 px-3 space-y-1 overflow-y-auto">
              <NavItem href="/" icon={<LayoutDashboard size={17} />} label="Command Center" />
              <NavItem href="/capital-graph" icon={<GitGraph size={17} />} label="Capital Graph" />
              <NavItem href="/opportunities" icon={<Target size={17} />} label="Opportunities" />
              <NavItem href="/referee" icon={<Shield size={17} />} label="Risk Referee" />
              <NavItem href="/fragility" icon={<AlertTriangle size={17} />} label="Fragility Matrix" />
              <NavItem href="/positions" icon={<Briefcase size={17} />} label="Positions & Thesis" />
              <NavItem href="/autopsy" icon={<Microscope size={17} />} label="Allocation Autopsy" />
              <NavItem href="/agent-os" icon={<Cpu size={17} />} label="Agent OS & MCP" />
              <NavItem href="/journal" icon={<BookOpen size={17} />} label="System Journal" />
            </nav>
            
            <div className="p-3 border-t border-[#1e293b]">
              <NavItem href="/config" icon={<Settings size={17} />} label="Risk Configuration" />
            </div>
          </aside>
          
          {/* Main Content */}
          <main className="flex-1 overflow-auto bg-[#0a0e17] p-6">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}

function NavItem({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <a 
      href={href}
      className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-100 hover:bg-[#111827] transition-colors"
    >
      {icon}
      <span>{label}</span>
    </a>
  );
}
