"use client";

/**
 * ATAL AI — Full UI Preview (Student + Teacher + Admin)
 * Route: /ui-preview  (dev only — blocked in production)
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, BookOpen, MessageSquare, Target, User,
  LogOut, ChevronRight, Flame, Trophy, Users, Sparkles, Plus,
  ArrowLeft, Volume2, Heart, MoreVertical, Zap, Camera, Globe,
  BarChart3, ShieldCheck, School, Download, Search, Settings,
  AlertTriangle, CheckCircle2, TrendingUp, UserCheck, QrCode,
  Bell, Eye, Trash2, Lock,
} from "lucide-react";

// ─── TOKENS ──────────────────────────────────────────────────────────────────
const PRIMARY  = "#F98819";
const GRAD     = "var(--gradient-primary)";
const GLOW     = "0 4px 14px 0 rgba(249,136,25,0.39)";
const DARK_BG  = "#0F172A";

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const MODULES = [
  { id:"m1", title:"Digital Literacy 101", progress:65, icon:"🌐", color:"#3B82F6",
    topics:[{title:"Hardware Basics"},{title:"Internet Safety"}] },
  { id:"m2", title:"Communication Tools",  progress:20, icon:"✉️", color:"#8B5CF6",
    topics:[{title:"Email Etiquette"},{title:"Social Media"}] },
];
const STUDENTS = [
  { id:"s1", name:"Arjun Das",    score:92, progress:85, status:"proficient",  active:true  },
  { id:"s2", name:"Priya Gogoi",  score:78, progress:42, status:"developing",  active:true  },
  { id:"s3", name:"Rahul Sarma",  score:45, progress:12, status:"beginner",    active:false },
  { id:"s4", name:"Meena Borah",  score:88, progress:70, status:"proficient",  active:true  },
];
const CLASSES = [
  { id:"c1", name:"Class 9A",  students:24, avgScore:74, code:"ABC123" },
  { id:"c2", name:"Class 10B", students:18, avgScore:61, code:"XYZ789" },
];
const SCHOOLS = [
  { id:"sc1", name:"Govt. HS Guwahati",   teachers:4, students:120, status:"active"   },
  { id:"sc2", name:"Kendriya Vidyalaya",   teachers:6, students:200, status:"active"   },
  { id:"sc3", name:"Navodaya Vidyalaya",   teachers:2, students:80,  status:"pending"  },
];
const LESSON_STEPS = [
  { title:"Meet the Machine", content:"A computer is like a helpful friend that follows your instructions exactly.", img:"🤖", color:"var(--gradient-teacher)" },
  { title:"Input: The Ears",  content:"Keyboards and mice are the ears of the computer. They tell the machine what you want.", img:"🎧", color:"linear-gradient(135deg,#F98819,#FFD166)" },
  { title:"The Brain (CPU)", content:"The CPU calculates everything in a blink — it is the smartest part!", img:"🧠", color:"linear-gradient(135deg,#10B981,#34D399)" },
];

// ─── PRIMITIVES ───────────────────────────────────────────────────────────────
function Btn({ children, variant="primary", className="", onClick, style={} }:Readonly<{
  children:React.ReactNode; variant?:string; className?:string;
  onClick?:()=>void; style?:React.CSSProperties;
}>) {
  const S:Record<string,React.CSSProperties> = {
    primary:   { background:GRAD, color:"#fff", boxShadow:GLOW, border:"2px solid rgba(255,255,255,0.2)" },
    secondary: { background:"#fff", color:PRIMARY, border:"2px solid #FDE8CC" },
    ghost:     { background:"transparent", color:"#64748B" },
    dark:      { background:DARK_BG, color:"#fff" },
    danger:    { background:"#FEF2F2", color:"#DC2626", border:"1px solid #FECACA" },
    outline:   { background:"#fff", color:"#475569", border:"1px solid #E2E8F0" },
  };
  return (
    <button
      className={`px-5 py-3 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 cursor-pointer select-none active:scale-95 ${className}`}
      style={{ ...S[variant], ...style }}
      onClick={onClick}
    >{children}</button>
  );
}

function GCard({ children, className="", hover=true, style={} }:Readonly<{
  children:React.ReactNode; className?:string; hover?:boolean; style?:React.CSSProperties;
}>) {
  return (
    <div
      className={`bg-white rounded-2xl border border-slate-100 p-5 transition-all ${hover?"hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] hover:-translate-y-1":""} ${className}`}
      style={{ boxShadow:"0 8px 30px rgb(0,0,0,0.05)", ...style }}
    >{children}</div>
  );
}

function StatusBadge({ status }:Readonly<{ status:string }>) {
  const map:Record<string,string> = {
    proficient:"bg-emerald-100 text-emerald-700",
    developing:"bg-blue-100 text-blue-700",
    beginner:  "bg-orange-100 text-orange-700",
    active:    "bg-emerald-100 text-emerald-700",
    pending:   "bg-yellow-100 text-yellow-700",
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${map[status]||"bg-slate-100 text-slate-500"}`}>
      {status}
    </span>
  );
}

function StatPill({ icon, value, label }:Readonly<{ icon:string; value:string|number; label:string }>) {
  return (
    <div className="bg-white rounded-2xl p-4 flex flex-col items-center text-center gap-1 border border-slate-100"
      style={{ boxShadow:"0 4px 20px rgb(0,0,0,0.05)" }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background:"#FFF5EB" }}>{icon}</div>
      <p className="text-xl font-black text-slate-800 leading-none">{value}</p>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
    </div>
  );
}

// ─── SHARED HEADER ────────────────────────────────────────────────────────────
function getRoleClass(role: string): string {
  if (role === "Teacher") return "bg-blue-100 text-blue-700";
  if (role === "Student") return "bg-orange-100 text-orange-700";
  return "bg-purple-100 text-purple-700";
}
function getSecurityIcon(level: string): React.ReactNode {
  if (level === "warning") return <AlertTriangle size={18}/>;
  if (level === "info") return <Lock size={18}/>;
  return <CheckCircle2 size={18}/>;
}

function getRoleLabel(role: string): string {
  if (role === "teacher") return "Teacher Console";
  if (role === "admin") return "Admin Panel";
  return "Digital Literacy Platform";
}
function getRoleBadgeColor(role: string): string {
  if (role === "admin") return "#DC2626";
  if (role === "teacher") return "#3B82F6";
  return PRIMARY;
}
function getRoleBg(role: string): string {
  if (role === "admin") return "var(--gradient-admin)";
  if (role === "teacher") return "var(--gradient-teacher)";
  return GRAD;
}
function getRoleInitials(role: string): string {
  if (role === "admin") return "AD";
  if (role === "teacher") return "TC";
  return "AI";
}

function AppHeader({ role, onSignOut }:Readonly<{ role:string; onSignOut:()=>void }>) {
  const roleLabel = getRoleLabel(role);
  const roleBadgeColor = getRoleBadgeColor(role);
  return (
    <header className="sticky top-0 z-50 -mx-4 px-4 py-3 flex items-center justify-between border-b border-slate-100"
      style={{ background:"rgba(255,255,255,0.88)", backdropFilter:"blur(16px)" }}>
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-black text-sm shadow-lg"
          style={{ background: getRoleBg(role), boxShadow:GLOW }}>
          {getRoleInitials(role)}
        </div>
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ATAL AI</p>
          <p className="text-xs font-bold" style={{ color:roleBadgeColor }}>{roleLabel}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Globe size={16} className="text-slate-400" />
        <Bell size={16} className="text-slate-400" />
        <button onClick={onSignOut} className="p-2 rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100">
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}

// ─── BOTTOM NAV (student only) ────────────────────────────────────────────────
const STUDENT_NAV = [
  { id:"dashboard", icon:LayoutDashboard, label:"Home"  },
  { id:"learn",     icon:BookOpen,        label:"Learn"  },
  { id:"ai",        icon:MessageSquare,   label:"Tutor"  },
  { id:"exams",     icon:Target,          label:"Exams"  },
  { id:"me",        icon:User,            label:"Me"     },
];

function BottomNav({ active, onChange }:Readonly<{ active:string; onChange:(id:string)=>void }>) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 pb-6 pt-3 px-6 border-t border-slate-100"
      style={{ background:"rgba(255,255,255,0.82)", backdropFilter:"blur(20px)", zIndex:300 }}>
      <div className="max-w-xl mx-auto flex justify-between items-end">
        {STUDENT_NAV.map(({ id, icon:Icon, label }) => {
          const on = active===id;
          return (
            <button key={id} onClick={()=>onChange(id)} className="flex flex-col items-center gap-1 transition-all"
              style={{ color:on?PRIMARY:"#94A3B8" }}>
              <div className="p-2.5 rounded-2xl transition-all duration-300"
                style={on?{ background:PRIMARY, color:"#fff", boxShadow:GLOW, transform:"scale(1.1)" }:{}}>
                <Icon size={20} strokeWidth={on?2.5:2}/>
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest" style={{ opacity:on?1:0.4 }}>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// ─── TEACHER NAV ──────────────────────────────────────────────────────────────
const TEACHER_NAV = [
  { id:"dashboard", label:"Dashboard",  icon:LayoutDashboard },
  { id:"classes",   label:"Classes",    icon:Users           },
  { id:"analytics", label:"Analytics",  icon:BarChart3       },
  { id:"settings",  label:"Settings",   icon:Settings        },
];

function TeacherSidebar({ active, onChange }:Readonly<{ active:string; onChange:(id:string)=>void }>) {
  return (
    <aside className="hidden md:flex flex-col w-56 bg-white border-r border-slate-100 min-h-screen pt-6 px-3 gap-1"
      style={{ boxShadow:"2px 0 20px rgb(0,0,0,0.03)" }}>
      {TEACHER_NAV.map(({ id, label, icon:Icon }) => {
        const on = active===id;
        return (
          <button key={id} onClick={()=>onChange(id)}
            className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-black transition-all"
            style={on
              ? { background:`${PRIMARY}15`, color:PRIMARY }
              : { color:"#64748B" }}>
            <Icon size={18} strokeWidth={on?2.5:2}/>
            {label}
          </button>
        );
      })}
    </aside>
  );
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────
function AuthView({ onAuth }:Readonly<{ onAuth:(role:string)=>void }>) {
  const [step, setStep] = useState<"login"|"profile">("login");
  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden" style={{ background:"#F8FAFC" }}>
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-3xl opacity-40 animate-pulse" style={{ background:"#FFD166" }}/>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full blur-3xl opacity-20" style={{ background:"#3B82F6" }}/>

      <motion.div initial={{ opacity:0, y:30 }} animate={{ opacity:1, y:0 }} className="w-full max-w-md z-10">
        <div className="rounded-[40px] p-10 border border-white/60"
          style={{ background:"rgba(255,255,255,0.78)", backdropFilter:"blur(24px)", boxShadow:"0 32px 80px rgba(0,0,0,0.12)" }}>
          <AnimatePresence mode="wait">
            {step==="login" && (
              <motion.div key="login" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
                <div className="text-center mb-10">
                  <motion.div whileHover={{ rotate:15 }} className="w-20 h-20 mx-auto rounded-[24px] flex items-center justify-center mb-6 shadow-xl" style={{ background:GRAD }}>
                    <Zap className="text-white w-10 h-10" strokeWidth={3}/>
                  </motion.div>
                  <h1 className="text-4xl font-black text-slate-900 tracking-tight">ATAL AI</h1>
                  <p className="text-slate-500 font-medium mt-2">Digital Empowerment Platform</p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label htmlFor="preview-identifier" className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Email / Username / Phone</label>
                    <input id="preview-identifier" className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none text-sm font-medium" placeholder="arjun@example.com"/>
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="preview-password" className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Password</label>
                    <input id="preview-password" className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none text-sm font-medium" type="password" placeholder="••••••••"/>
                  </div>
                  <div className="space-y-3 pt-2">
                    <Btn onClick={()=>setStep("profile")} className="w-full py-5 text-base">Student Portal →</Btn>
                    <div className="flex gap-3">
                      <Btn onClick={()=>onAuth("teacher")} variant="secondary" className="flex-1 text-sm">Teacher</Btn>
                      <Btn onClick={()=>onAuth("admin")}   variant="dark"      className="flex-1 text-sm">Admin</Btn>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
            {step==="profile" && (
              <motion.div key="profile" initial={{ opacity:0, scale:0.92 }} animate={{ opacity:1, scale:1 }}>
                <button onClick={()=>setStep("login")} className="mb-6 text-slate-400 hover:text-slate-700 flex items-center gap-1 text-sm font-bold">
                  <ArrowLeft size={16}/> Back
                </button>
                <h2 className="text-3xl font-black mb-1 text-slate-900">Create Your Profile</h2>
                <p className="text-slate-500 font-medium mb-8 text-sm">Personalise your learning journey on ATAL AI.</p>
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <div className="relative">
                      <div className="w-28 h-28 rounded-[28px] flex items-center justify-center border-4 border-white overflow-hidden"
                        style={{ background:"#FFF5EB", boxShadow:"0 8px 24px rgba(0,0,0,0.1)" }}>
                        <User size={56} style={{ color:PRIMARY }}/>
                      </div>
                      <button className="absolute -right-2 -bottom-2 p-2.5 rounded-2xl text-white shadow-lg" style={{ background:"#3B82F6" }}>
                        <Camera size={18} strokeWidth={2.5}/>
                      </button>
                    </div>
                  </div>
                  <input className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none text-sm font-medium" placeholder="Full Name"/>
                  <div className="grid grid-cols-2 gap-3">
                    <input className="px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none text-sm font-bold" placeholder="Roll No."/>
                    <input className="px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none text-sm font-bold" placeholder="School"/>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <select className="px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 text-slate-600 font-bold text-sm">
                      <option>Class 9</option><option>Class 10</option>
                    </select>
                    <input className="px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none text-sm font-bold" placeholder="Village"/>
                  </div>
                  <Btn onClick={()=>onAuth("student")} className="w-full py-5 text-base">Jump In! 🚀</Btn>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

// ─── STUDENT DASHBOARD ────────────────────────────────────────────────────────
function StudentDashboard({ setView, onSignOut }:Readonly<{ setView:(v:string)=>void; onSignOut:()=>void }>) {
  return (
    <div className="pb-32 pt-6 px-4 max-w-4xl mx-auto space-y-8">
      <AppHeader role="student" onSignOut={onSignOut}/>

      {/* Welcome Banner */}
      <div className="rounded-2xl p-6 shadow-lg" style={{ background:GRAD, boxShadow:GLOW }}>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-2xl">👦</div>
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight">Namaste, Arjun!</h2>
              <p className="text-sm text-white/80 font-medium">Welcome back to your learning journey</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 w-fit rounded-full px-3 py-1" style={{ background:"rgba(255,255,255,0.22)", backdropFilter:"blur(8px)" }}>
            <Flame size={14} fill="#FDE047" stroke="#FDE047"/>
            <span className="text-xs font-black text-white">7 Day Streak</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatPill icon="📚" value={1}    label="Classes Joined"/>
        <StatPill icon="📝" value={3}    label="Assessments"/>
        <StatPill icon="🎯" value="72%" label="Avg Score"/>
        <StatPill icon="🔥" value={7}    label="Day Streak"/>
      </div>

      {/* Hero Action Card */}
      <GCard className="border-none text-white p-7 relative overflow-hidden group" style={{ background:DARK_BG, boxShadow:"0 20px 60px rgba(0,0,0,0.2)" }}>
        <div className="relative z-10">
          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-orange-100 text-orange-600">New Challenge</span>
          <h3 className="text-xl font-black mt-4 mb-2 text-white leading-tight max-w-[220px]">Digital Literacy Mastery Assessment</h3>
          <p className="text-slate-400 text-sm mb-5 max-w-[260px]">Complete this to earn the Byte-Sized Brain badge!</p>
          <Btn onClick={()=>setView("lesson")} className="px-6 py-3 text-sm">Resume Mission <ChevronRight size={16}/></Btn>
        </div>
        <Trophy className="absolute -right-6 -bottom-6 w-40 h-40 text-white/5 rotate-12 group-hover:rotate-6 transition-transform duration-700"/>
        <div className="absolute right-0 top-0 bottom-0 w-1/3 pointer-events-none" style={{ background:"linear-gradient(to left,rgba(249,136,25,0.15),transparent)" }}/>
      </GCard>

      {/* Learning Path */}
      <section>
        <div className="flex justify-between items-end mb-4 px-1">
          <div>
            <h3 className="text-xl font-black text-slate-900">Your Learning Path</h3>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">2 modules · 23 units</p>
          </div>
          <button className="text-sm font-black" style={{ color:PRIMARY }}>View All</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {MODULES.map(mod=>(
            <GCard key={mod.id} className="group relative overflow-hidden">
              <div className="flex justify-between items-start mb-5">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-lg" style={{ background:mod.color }}>{mod.icon}</div>
                <div className="text-right">
                  <div className="text-2xl font-black text-slate-800">{mod.progress}%</div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Complete</div>
                </div>
              </div>
              <h4 className="text-lg font-black text-slate-800 mb-1">{mod.title}</h4>
              <p className="text-slate-400 text-xs font-medium mb-5">{mod.topics.map(t=>t.title).join(" · ")}</p>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden mb-4">
                <motion.div initial={{ width:0 }} animate={{ width:`${mod.progress}%` }} transition={{ duration:0.8, ease:"easeOut" }}
                  className="h-full rounded-full" style={{ background:GRAD }}/>
              </div>
              <div className="flex gap-2">
                <Btn onClick={()=>setView("lesson")} variant="secondary" className="flex-1 py-2.5 text-xs">Continue</Btn>
                <button className="p-2.5 rounded-2xl bg-slate-50 text-slate-400 hover:bg-slate-100"><MoreVertical size={15}/></button>
              </div>
            </GCard>
          ))}
          <GCard className="border-2 border-dashed border-slate-200 bg-transparent flex flex-col items-center justify-center p-10 hover:border-orange-300 hover:bg-orange-50/20 group">
            <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-300 group-hover:text-orange-400 mb-3 transition-colors">
              <Plus size={22} strokeWidth={2.5}/>
            </div>
            <span className="font-black text-slate-400 text-[11px] uppercase tracking-widest">Explore More</span>
          </GCard>
        </div>
      </section>

      {/* Badges + Leaderboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <section>
          <h3 className="text-lg font-black text-slate-900 mb-3 flex items-center gap-2">
            <Sparkles size={18} style={{ color:"#F59E0B" }}/> Achievement Hall
          </h3>
          <GCard className="p-3" hover={false}>
            <div className="flex gap-2">
              {(["🏆","🔥","🛡️","⚡"] as const).map((b, i)=>(
                <div key={b} className="flex-1 aspect-square rounded-2xl flex items-center justify-center text-xl cursor-pointer hover:bg-orange-50 transition-all"
                  style={{ background:"#F8FAFC", filter:i<2?"none":"grayscale(100%)" }}>{b}</div>
              ))}
            </div>
          </GCard>
        </section>
        <section>
          <h3 className="text-lg font-black text-slate-900 mb-3 flex items-center gap-2">
            <Users size={18} className="text-blue-500"/> Class Standings
          </h3>
          <GCard className="p-3" hover={false}>
            {STUDENTS.slice(0,3).map((s,i)=>(
              <div key={s.id} className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="w-6 text-center font-black text-sm" style={{ color:i===0?"#F59E0B":"#CBD5E1" }}>#{i+1}</span>
                  <div className="w-8 h-8 rounded-full bg-slate-200"/>
                  <span className="text-sm font-bold text-slate-700">{s.name}</span>
                </div>
                <span className="text-xs font-black" style={{ color:PRIMARY }}>{s.score} pts</span>
              </div>
            ))}
          </GCard>
        </section>
      </div>

      {/* Quick Actions */}
      <section>
        <h3 className="text-lg font-black text-slate-900 mb-3 px-1">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { emoji:"📖", title:"Learn",       desc:"Continue your modules" },
            { emoji:"🤖", title:"AI Tutor",    desc:"Ask anything"          },
            { emoji:"📝", title:"Assessments", desc:"Test your knowledge"   },
            { emoji:"📊", title:"Progress",    desc:"Track your growth"     },
            { emoji:"👥", title:"Classes",     desc:"View your class"       },
            { emoji:"👤", title:"Profile",     desc:"Manage account"        },
          ].map(item=>(
            <button type="button" key={item.title} className="p-[2px] rounded-2xl cursor-pointer hover:-translate-y-1 transition-all text-left w-full"
              style={{ background:GRAD, boxShadow:"0 4px 14px rgba(249,136,25,0.2)" }} onClick={()=>setView("lesson")}>
              <div className="bg-white rounded-2xl p-4 h-full">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{ background:"#FFF5EB" }}>{item.emoji}</div>
                  <span className="font-black text-slate-800 text-sm">{item.title}</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

// ─── LESSON PLAYER ────────────────────────────────────────────────────────────
function LessonPlayer({ onBack }:Readonly<{ onBack:()=>void }>) {
  const [step, setStep] = useState(0);
  const cur = LESSON_STEPS[step];
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="sticky top-0 z-10 px-5 py-4 flex items-center justify-between border-b border-slate-50"
        style={{ background:"rgba(255,255,255,0.9)", backdropFilter:"blur(16px)" }}>
        <button onClick={onBack} className="w-11 h-11 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-600 hover:bg-slate-100 active:scale-95 transition-all shadow-sm">
          <ArrowLeft size={18} strokeWidth={2.5}/>
        </button>
        <div className="flex-1 mx-6">
          <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
            <span>Unit Progress</span><span>{Math.round(((step+1)/LESSON_STEPS.length)*100)}%</span>
          </div>
          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <motion.div className="h-full rounded-full" style={{ background:GRAD }}
              animate={{ width:`${((step+1)/LESSON_STEPS.length)*100}%` }} transition={{ duration:0.4 }}/>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Heart size={18} fill="#EF4444" stroke="#EF4444"/>
          <span className="font-black text-slate-700 text-sm">3</span>
        </div>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-lg mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity:0, x:50 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-50 }} transition={{ duration:0.25 }}
            className="w-full flex flex-col items-center">
            <div className="w-56 h-56 md:w-72 md:h-72 rounded-[52px] flex items-center justify-center mb-10 shadow-2xl"
              style={{ background:cur.color, fontSize:96, transform:"rotate(3deg)" }}>{cur.img}</div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-4">{cur.title}</h2>
            <p className="text-lg text-slate-500 leading-relaxed font-medium">{cur.content}</p>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="p-8 max-w-md mx-auto w-full">
        <div className="flex gap-3">
          <Btn variant="secondary" className="flex-1 py-4"><Volume2 size={18}/> Audio</Btn>
          <Btn className="flex-1 py-4" onClick={()=>step<LESSON_STEPS.length-1?setStep(step+1):onBack()}>
            {step<LESSON_STEPS.length-1?"Got it! →":"Finish 🎉"}
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ─── TEACHER CONSOLE ─────────────────────────────────────────────────────────
function TeacherConsole({ onSignOut }:Readonly<{ onSignOut:()=>void }>) {
  const [tab, setTab] = useState("dashboard");

  return (
    <div className="min-h-screen flex" style={{ background:"#F8FAFC" }}>
      <TeacherSidebar active={tab} onChange={setTab}/>

      <div className="flex-1 min-w-0">
        <div className="px-6 pt-6 pb-32 max-w-5xl mx-auto space-y-8">
          <AppHeader role="teacher" onSignOut={onSignOut}/>

          {/* Mobile Nav Tabs */}
          <div className="flex md:hidden gap-2 overflow-x-auto pb-1">
            {TEACHER_NAV.map(({id,label,icon:Icon})=>(
              <button key={id} onClick={()=>setTab(id)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black whitespace-nowrap transition-all shrink-0"
                style={tab===id?{ background:`${PRIMARY}15`, color:PRIMARY }:{ background:"#fff", color:"#64748B", border:"1px solid #E2E8F0" }}>
                <Icon size={14}/>{label}
              </button>
            ))}
          </div>

          {/* ── TEACHER DASHBOARD ── */}
          {tab==="dashboard" && (
            <div className="space-y-8">
              {/* Metrics */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatPill icon="🏫" value={2}    label="Classes"/>
                <StatPill icon="👥" value={42}   label="Students"/>
                <StatPill icon="✅" value={38}   label="Active"/>
                <StatPill icon="⚠️" value={4}    label="At Risk"/>
              </div>

              {/* Welcome */}
              <div className="rounded-2xl p-6" style={{ background:"var(--gradient-teacher)", boxShadow:"0 4px 14px rgba(99,102,241,0.35)" }}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-black text-white">Welcome, Meera Ma&apos;am!</h2>
                    <p className="text-blue-100 text-sm font-medium mt-1">Monitor your students&apos; progress in real time</p>
                  </div>
                  <Btn variant="outline" className="shrink-0 text-sm font-black" style={{ background:"rgba(255,255,255,0.9)" }}>
                    <Plus size={16}/> New Class
                  </Btn>
                </div>
              </div>

              {/* Student Progress Grid */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-black text-slate-900">Student Progress</h3>
                  <Btn variant="outline" className="text-xs py-2 px-4"><Download size={14}/> Export CSV</Btn>
                </div>
                <GCard hover={false} className="overflow-hidden p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="text-left px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Student</th>
                          <th className="text-left px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Progress</th>
                          <th className="text-left px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Score</th>
                          <th className="text-left px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                          <th className="text-left px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Active</th>
                        </tr>
                      </thead>
                      <tbody>
                        {STUDENTS.map(s=>(
                          <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-xs font-black text-slate-500">
                                  {s.name.split(" ").map(n=>n[0]).join("")}
                                </div>
                                <span className="font-bold text-slate-700">{s.name}</span>
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full rounded-full" style={{ width:`${s.progress}%`, background:GRAD }}/>
                                </div>
                                <span className="text-xs font-black text-slate-500">{s.progress}%</span>
                              </div>
                            </td>
                            <td className="px-5 py-4 font-black text-slate-800">{s.score}</td>
                            <td className="px-5 py-4"><StatusBadge status={s.status}/></td>
                            <td className="px-5 py-4">
                              {s.active
                                ? <CheckCircle2 size={18} className="text-emerald-500"/>
                                : <AlertTriangle size={18} className="text-orange-400"/>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </GCard>
              </section>

              {/* AI Interactions */}
              <section>
                <h3 className="text-xl font-black text-slate-900 mb-4">AI Tutor Interactions</h3>
                <div className="space-y-3">
                  {[
                    { student:"Arjun Das",   q:"What is RAM?",                   time:"2 min ago" },
                    { student:"Priya Gogoi", q:"How does the internet work?",     time:"15 min ago" },
                    { student:"Meena Borah", q:"Explain binary numbers",          time:"1 hr ago" },
                  ].map((item)=>(
                    <GCard key={item.student} hover={false} className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-black text-xs">
                          {item.student.split(" ").map(n=>n[0]).join("")}
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-800">{item.student}</p>
                          <p className="text-xs text-slate-400 font-medium">&quot;{item.q}&quot;</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{item.time}</span>
                    </GCard>
                  ))}
                </div>
              </section>
            </div>
          )}

          {/* ── CLASSES TAB ── */}
          {tab==="classes" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-slate-900">My Classes</h3>
                <Btn className="text-sm py-2.5"><Plus size={16}/> New Class</Btn>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {CLASSES.map(cls=>(
                  <GCard key={cls.id}>
                    <div className="flex items-start justify-between mb-5">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-lg" style={{ background:"var(--gradient-teacher)" }}>
                        🏫
                      </div>
                      <StatusBadge status="active"/>
                    </div>
                    <h4 className="text-xl font-black text-slate-900 mb-1">{cls.name}</h4>
                    <p className="text-slate-400 text-xs font-medium mb-5">{cls.students} students enrolled · Avg {cls.avgScore}%</p>
                    <div className="flex items-center justify-between p-3 rounded-2xl mb-4" style={{ background:"#F8FAFC" }}>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Invite Code</p>
                        <p className="text-xl font-black text-slate-800 tracking-widest">{cls.code}</p>
                      </div>
                      <div className="flex gap-2">
                        <button className="p-2.5 rounded-xl bg-white shadow-sm text-slate-500 hover:text-blue-600 transition-colors"><QrCode size={18}/></button>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Btn variant="secondary" className="flex-1 text-xs py-2.5"><Eye size={14}/> View Roster</Btn>
                      <Btn className="flex-1 text-xs py-2.5"><BarChart3 size={14}/> Analytics</Btn>
                    </div>
                  </GCard>
                ))}
                <GCard className="border-2 border-dashed border-slate-200 bg-transparent flex flex-col items-center justify-center p-10 hover:border-blue-300 hover:bg-blue-50/20 group cursor-pointer">
                  <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-300 group-hover:text-blue-400 mb-3 transition-colors">
                    <Plus size={22} strokeWidth={2.5}/>
                  </div>
                  <span className="font-black text-slate-400 text-[11px] uppercase tracking-widest">Create Class</span>
                </GCard>
              </div>
            </div>
          )}

          {/* ── ANALYTICS TAB ── */}
          {tab==="analytics" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-slate-900">Class Analytics</h3>
                <Btn variant="outline" className="text-xs py-2 px-4"><Download size={14}/> Export</Btn>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { label:"Avg Completion", value:"52%", icon:<TrendingUp size={20}/>, color:"#3B82F6" },
                  { label:"Pre-Assessment", value:"68%", icon:<Target size={20}/>, color:PRIMARY },
                  { label:"Active Today",   value:"38",  icon:<UserCheck size={20}/>, color:"#10B981" },
                ].map((m)=>(
                  <GCard key={m.label} hover={false}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ background:m.color }}>
                        {m.icon}
                      </div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{m.label}</p>
                    </div>
                    <p className="text-3xl font-black text-slate-900">{m.value}</p>
                  </GCard>
                ))}
              </div>

              {/* Score distribution bars */}
              <GCard hover={false}>
                <h4 className="font-black text-slate-800 mb-5">Score Distribution</h4>
                <div className="space-y-3">
                  {[
                    { label:"90-100 (Excellent)", count:8,  pct:19 },
                    { label:"75-89  (Good)",       count:18, pct:43 },
                    { label:"60-74  (Average)",    count:12, pct:29 },
                    { label:"Below 60 (At Risk)",  count:4,  pct:9  },
                  ].map((r)=>(
                    <div key={r.label}>
                      <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                        <span>{r.label}</span><span>{r.count} students</span>
                      </div>
                      <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div initial={{ width:0 }} animate={{ width:`${r.pct}%` }} transition={{ duration:0.7 }}
                          className="h-full rounded-full" style={{ background:r.label.includes("At Risk")?"#EF4444":GRAD }}/>
                      </div>
                    </div>
                  ))}
                </div>
              </GCard>
            </div>
          )}

          {/* ── SETTINGS TAB ── */}
          {tab==="settings" && (
            <div className="space-y-6 max-w-lg">
              <h3 className="text-xl font-black text-slate-900">Profile Settings</h3>
              <GCard hover={false}>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-20 h-20 rounded-[24px] bg-blue-100 flex items-center justify-center text-3xl">👩‍🏫</div>
                  <div>
                    <p className="font-black text-slate-800 text-lg">Meera Sharma</p>
                    <p className="text-sm text-slate-400">meera@school.edu.in</p>
                    <StatusBadge status="active"/>
                  </div>
                </div>
                <div className="space-y-3">
                  {["Full Name","Email","School Name","Phone"].map(field=>(
                    <div key={field}>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{field}</label>
                      <input className="w-full mt-1 px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 outline-none text-sm font-medium" placeholder={field}/>
                    </div>
                  ))}
                  <Btn className="w-full py-4 mt-2">Save Changes</Btn>
                </div>
              </GCard>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── ADMIN PANEL ──────────────────────────────────────────────────────────────
const ADMIN_NAV = [
  { id:"overview",  label:"Overview",      icon:LayoutDashboard },
  { id:"schools",   label:"Schools",       icon:School          },
  { id:"users",     label:"Users",         icon:Users           },
  { id:"security",  label:"Security",      icon:ShieldCheck     },
];

function AdminPanel({ onSignOut }:Readonly<{ onSignOut:()=>void }>) {
  const [tab, setTab] = useState("overview");

  return (
    <div className="min-h-screen flex" style={{ background:"#F8FAFC" }}>
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-60 min-h-screen pt-6 px-3 gap-1 border-r border-slate-100"
        style={{ background:"#0F172A" }}>
        <div className="px-4 mb-8">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-sm mb-3"
            style={{ background:"var(--gradient-admin)" }}>AD</div>
          <p className="text-white font-black text-sm">ATAL AI Admin</p>
          <p className="text-slate-400 text-xs">Super Administrator</p>
        </div>
        {ADMIN_NAV.map(({id,label,icon:Icon})=>{
          const on = tab===id;
          return (
            <button key={id} onClick={()=>setTab(id)}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-black transition-all"
              style={on?{ background:"rgba(255,255,255,0.12)", color:"#fff" }:{ color:"#94A3B8" }}>
              <Icon size={18}/>{label}
            </button>
          );
        })}
        <div className="mt-auto mb-6 px-4">
          <button onClick={onSignOut} className="flex items-center gap-2 text-slate-500 hover:text-white text-sm font-black transition-colors">
            <LogOut size={16}/> Sign Out
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <div className="px-6 pt-6 pb-10 max-w-6xl mx-auto space-y-8">
          <AppHeader role="admin" onSignOut={onSignOut}/>

          {/* Mobile Tabs */}
          <div className="flex md:hidden gap-2 overflow-x-auto pb-1">
            {ADMIN_NAV.map(({id,label,icon:Icon})=>(
              <button key={id} onClick={()=>setTab(id)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black whitespace-nowrap shrink-0 transition-all"
                style={tab===id?{ background:`${PRIMARY}15`, color:PRIMARY }:{ background:"#fff", color:"#64748B", border:"1px solid #E2E8F0" }}>
                <Icon size={14}/>{label}
              </button>
            ))}
          </div>

          {/* ── OVERVIEW ── */}
          {tab==="overview" && (
            <div className="space-y-8">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatPill icon="🏫" value={24}   label="Schools"/>
                <StatPill icon="👩‍🏫" value={96}   label="Teachers"/>
                <StatPill icon="👥" value="4.2k" label="Students"/>
                <StatPill icon="🤖" value="12k"  label="AI Sessions"/>
              </div>

              {/* Platform health */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { label:"Avg Completion Rate", value:"58%", trend:"+4%", color:"#10B981" },
                  { label:"Active This Week",     value:"3.1k", trend:"+12%", color:"#3B82F6" },
                  { label:"Assessments Done",     value:"890", trend:"+7%", color:PRIMARY },
                ].map((m)=>(
                  <GCard key={m.label} hover={false}>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{m.label}</p>
                    <div className="flex items-end justify-between">
                      <p className="text-3xl font-black text-slate-900">{m.value}</p>
                      <span className="text-xs font-black px-2 py-1 rounded-full" style={{ background:`${m.color}20`, color:m.color }}>{m.trend} this week</span>
                    </div>
                  </GCard>
                ))}
              </div>

              {/* Recent activity */}
              <section>
                <h3 className="text-xl font-black text-slate-900 mb-4">Recent Activity</h3>
                <div className="space-y-3">
                  {[
                    { icon:"🏫", text:"Govt. HS Dibrugarh onboarded",           time:"2 min ago",  color:"#10B981" },
                    { icon:"👩‍🏫", text:"3 new teachers registered",                time:"14 min ago", color:"#3B82F6" },
                    { icon:"⚠️",  text:"4 students flagged as at-risk",            time:"1 hr ago",   color:"#F59E0B" },
                    { icon:"📊",  text:"Monthly report generated for District A", time:"3 hr ago",   color:PRIMARY   },
                  ].map((a)=>(
                    <GCard key={a.text} hover={false} className="flex items-center gap-4 p-4">
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg shrink-0" style={{ background:`${a.color}15` }}>{a.icon}</div>
                      <p className="text-sm font-bold text-slate-700 flex-1">{a.text}</p>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{a.time}</span>
                    </GCard>
                  ))}
                </div>
              </section>
            </div>
          )}

          {/* ── SCHOOLS TAB ── */}
          {tab==="schools" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-slate-900">Registered Schools</h3>
                <Btn className="text-sm py-2.5"><Plus size={16}/> Add School</Btn>
              </div>
              <div className="flex gap-3 mb-2">
                <div className="flex-1 flex items-center gap-3 bg-white rounded-2xl px-4 py-3 border border-slate-100 shadow-sm">
                  <Search size={16} className="text-slate-400"/>
                  <input className="flex-1 outline-none text-sm font-medium" placeholder="Search schools…"/>
                </div>
              </div>
              <GCard hover={false} className="overflow-hidden p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      {["School","Teachers","Students","Status","Actions"].map(h=>(
                        <th key={h} className="text-left px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {SCHOOLS.map(sc=>(
                      <tr key={sc.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center text-lg">🏫</div>
                            <span className="font-bold text-slate-700">{sc.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 font-black text-slate-800">{sc.teachers}</td>
                        <td className="px-5 py-4 font-black text-slate-800">{sc.students}</td>
                        <td className="px-5 py-4"><StatusBadge status={sc.status}/></td>
                        <td className="px-5 py-4">
                          <div className="flex gap-2">
                            <button className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"><Eye size={15}/></button>
                            <button className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={15}/></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </GCard>
            </div>
          )}

          {/* ── USERS TAB ── */}
          {tab==="users" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-slate-900">User Management</h3>
                <Btn className="text-sm py-2.5"><Plus size={16}/> Add User</Btn>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
                {[
                  { label:"Total Users", value:"4,318", icon:"👥", color:"#3B82F6" },
                  { label:"Teachers",   value:"96",     icon:"👩‍🏫", color:PRIMARY   },
                  { label:"Admins",     value:"8",      icon:"🔐", color:"#7C3AED"  },
                ].map((m)=>(
                  <GCard key={m.label} hover={false} className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background:`${m.color}15` }}>{m.icon}</div>
                    <div>
                      <p className="text-2xl font-black text-slate-900">{m.value}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{m.label}</p>
                    </div>
                  </GCard>
                ))}
              </div>
              <GCard hover={false} className="overflow-hidden p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      {["User","Role","School","Status","Actions"].map(h=>(
                        <th key={h} className="text-left px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { name:"Meera Sharma", role:"Teacher", school:"Govt HS Guwahati", status:"active" },
                      { name:"Arjun Das",    role:"Student", school:"Kendriya Vidyalaya", status:"active" },
                      { name:"Ravi Kumar",   role:"Teacher", school:"Navodaya Vidyalaya", status:"pending" },
                    ].map((u)=>(
                      <tr key={u.name} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-xs font-black text-slate-500">
                              {u.name.split(" ").map(n=>n[0]).join("")}
                            </div>
                            <span className="font-bold text-slate-700">{u.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getRoleClass(u.role)}`}>{u.role}</span>
                        </td>
                        <td className="px-5 py-4 text-slate-500 font-medium">{u.school}</td>
                        <td className="px-5 py-4"><StatusBadge status={u.status}/></td>
                        <td className="px-5 py-4">
                          <div className="flex gap-2">
                            <button className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"><Eye size={15}/></button>
                            <button className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={15}/></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </GCard>
            </div>
          )}

          {/* ── SECURITY TAB ── */}
          {tab==="security" && (
            <div className="space-y-6 max-w-2xl">
              <h3 className="text-xl font-black text-slate-900">Security & Access</h3>

              {/* Security alerts */}
              <div className="space-y-3">
                {[
                  { level:"warning", text:"3 failed login attempts from IP 103.21.x.x",   time:"5 min ago" },
                  { level:"info",    text:"Service role key last rotated 28 days ago",      time:"—"         },
                  { level:"success", text:"All RLS policies active and verified",           time:"Ongoing"   },
                ].map((a)=>{
                  const colors:Record<string,string> = { warning:"#F59E0B", info:"#3B82F6", success:"#10B981" };
                  return (
                    <GCard key={a.text} hover={false} className="flex items-center gap-4 p-4">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background:`${colors[a.level]}15`, color:colors[a.level] }}>
                        {getSecurityIcon(a.level)}
                      </div>
                      <p className="text-sm font-bold text-slate-700 flex-1">{a.text}</p>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{a.time}</span>
                    </GCard>
                  );
                })}
              </div>

              {/* PIN Management */}
              <GCard hover={false}>
                <h4 className="font-black text-slate-800 mb-4 flex items-center gap-2"><Lock size={16}/> PIN Management</h4>
                <div className="space-y-3">
                  {["Teacher PIN Reset","Admin PIN Update","Bulk PIN Generation"].map((action)=>(
                    <div key={action} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50">
                      <span className="text-sm font-bold text-slate-700">{action}</span>
                      <Btn variant="outline" className="text-xs py-2 px-3">{action==="Bulk PIN Generation"?"Generate":"Reset"}</Btn>
                    </div>
                  ))}
                </div>
              </GCard>

              {/* Rate Limits */}
              <GCard hover={false}>
                <h4 className="font-black text-slate-800 mb-4">Rate Limit Status</h4>
                <div className="space-y-3">
                  {[
                    { endpoint:"OTP / Auth",    used:42,  limit:100 },
                    { endpoint:"AI Tutor Chat", used:280, limit:500 },
                    { endpoint:"TTS Voice",     used:95,  limit:200 },
                  ].map((r)=>(
                    <div key={r.endpoint}>
                      <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                        <span>{r.endpoint}</span>
                        <span>{r.used}/{r.limit} req/hr</span>
                      </div>
                      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width:`${(r.used/r.limit)*100}%`, background:r.used/r.limit>0.8?"#EF4444":GRAD }}/>
                      </div>
                    </div>
                  ))}
                </div>
              </GCard>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function UIPreview() {
  const [role, setRole] = useState<string|null>(null);
  const [view, setView] = useState("dashboard");

  if (!role) return <AuthView onAuth={r=>{ setRole(r); setView("dashboard"); }}/>;
  if (role==="teacher") return <TeacherConsole onSignOut={()=>setRole(null)}/>;
  if (role==="admin")   return <AdminPanel onSignOut={()=>setRole(null)}/>;

  // Student
  if (view==="lesson") return <LessonPlayer onBack={()=>setView("dashboard")}/>;

  const placeholders:Record<string,{emoji:string;label:string}> = {
    ai:    { emoji:"🤖", label:"AI Tutor — coming in preview"       },
    exams: { emoji:"📝", label:"Assessments — coming in preview"    },
    me:    { emoji:"👤", label:"Profile Settings — coming in preview" },
  };

  return (
    <div className="min-h-screen" style={{ background:"#F8FAFC", fontFamily:"Nunito,sans-serif" }}>
      <main className="min-h-screen">
        {view==="dashboard"
          ? <StudentDashboard setView={v=>setView(v)} onSignOut={()=>setRole(null)}/>
          : (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4 pb-32">
              <span style={{ fontSize:64 }}>{placeholders[view]?.emoji}</span>
              <p className="text-xl font-black text-slate-700">{placeholders[view]?.label}</p>
              <Btn onClick={()=>setView("dashboard")} variant="secondary">← Back to Dashboard</Btn>
            </div>
          )
        }
      </main>
      <BottomNav active={view} onChange={v=>setView(v)}/>
    </div>
  );
}
