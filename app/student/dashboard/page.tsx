
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/frontend/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/frontend/components/ui/card';
import { Input } from '@/frontend/components/ui/input';
import {
  Send,
  User,
  Bot,
  GraduationCap,
  Mic,
  MicOff,
  Upload,
  Bus,
  Hotel,
  Coffee,
  LogOut,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  image?: string;
}

export default function StudentDashboard() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hello! I am your UOL AI Assistant. Ask me anything — bus timings, hostel info, HODs, cafes, and more. 🎓' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [departmentId, setDepartmentId] = useState('faculty-of-information-technology');
  const [departmentName, setDepartmentName] = useState('Faculty of Information Technology');
  const [activeTab, setActiveTab] = useState('knowledge');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [listenHint, setListenHint] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const deptId = localStorage.getItem("uol_department_id");
    const deptName = localStorage.getItem("uol_department_name");
    if (deptId) setDepartmentId(deptId);
    if (deptName) setDepartmentName(deptName);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // ─── TEXT TO SPEECH ────────────────────────────────────────────────────────
  const speakText = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) {
      alert('Text-to-Speech is not supported in this browser. Please use Chrome or Edge.');
      return;
    }
    window.speechSynthesis.cancel();
    // Strip markdown symbols for cleaner speech
    const cleanText = text.replace(/\*\*/g, '').replace(/\*/g, '').replace(/#+\s/g, '').replace(/`/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'en-US';
    utterance.rate = 0.95;
    utterance.pitch = 1.05;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, []);

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  // ─── VOICE RECOGNITION (SPEECH TO TEXT) ────────────────────────────────────
  const startListening = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Voice recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    // Stop if already listening
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      setIsListening(false);
      setListenHint('');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = true; // Show live transcript

    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setIsListening(true);
      setListenHint('Listening… speak now');
    };

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }
      // Show live preview in input box
      setInput(final || interim);
      setListenHint(final ? '✅ Got it! Sending…' : `Hearing: "${interim}"`);
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
      setListenHint('');
      // Auto-send the transcribed text
      setInput(prev => {
        if (prev.trim()) {
          // Trigger send after state update
          setTimeout(() => {
            const sendBtn = document.getElementById('send-btn') as HTMLButtonElement;
            if (sendBtn) sendBtn.click();
          }, 100);
        }
        return prev;
      });
    };

    recognition.onerror = (event: any) => {
      console.error('Speech error:', event.error);
      setIsListening(false);
      recognitionRef.current = null;
      if (event.error === 'not-allowed') {
        setListenHint('❌ Microphone access denied. Please allow microphone in your browser settings.');
      } else if (event.error === 'no-speech') {
        setListenHint('No speech detected. Try again.');
      } else {
        setListenHint(`Error: ${event.error}`);
      }
      setTimeout(() => setListenHint(''), 3000);
    };

    recognition.start();
  }, []);

  // ─── SEND MESSAGE ───────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if ((!trimmed && !selectedImage) || loading) return;

    const newMessage: Message = { role: 'user', content: trimmed || "What is in this image?" };
    if (selectedImage) {
        newMessage.image = selectedImage;
    }

    setMessages(prev => [...prev, newMessage]);
    setInput('');
    const currentImage = selectedImage;
    setSelectedImage(null);
    setLoading(true);

    try {
      const currentMessages = [...messages, newMessage];
      
      // Retry logic for API calls
      let res: Response | null = null;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: currentMessages, departmentId }),
        });

        // If successful or not a server error, break
        if (res.ok || res.status < 500) break;
        
        // If server error, wait and retry
        retryCount++;
        if (retryCount < maxRetries) {
          const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff: 2s, 4s, 8s
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      if (!res) {
        throw new Error('Failed to connect to API after retries');
      }

      const data = await res.json();

      if (data.response) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
        speakText(data.response);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ Error: ${data.error || 'Unknown error. Please try again.'}` }]);
      }
    } catch (error: any) {
      console.error('CHAT ERROR:', error);
      const errorMessage = error?.message || 'Network error. Please check your connection.';
      setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ Error: ${errorMessage}` }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, departmentId, speakText]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ─── FILE UPLOAD ────────────────────────────────────────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so the same file can be re-uploaded if needed
    e.target.value = '';

    setUploadStatus('📤 Uploading & indexing…');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('departmentId', departmentId);
    formData.append('type', 'resource'); // generic type for student uploads

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok && data.success) {
        setUploadStatus(`✅ ${file.name} uploaded & indexed!`);
      } else {
        setUploadStatus(`❌ ${data.error || 'Upload failed. Please try again.'}`);
      }
    } catch {
      setUploadStatus('❌ Network error. Please check your connection.');
    } finally {
      setTimeout(() => setUploadStatus(null), 5000);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // ─── QUICK PROMPTS ──────────────────────────────────────────────────────────
  const quickPrompts = [
    'Who is the HOD of AI?',
    'Calculate my GPA: A in AI (3 cr), B+ in OS (4 cr)',
    'Can you help me with assignment guidelines?',
    'What are the admission requirements?',
    'Tell me my BSAI timetable for Monday',
  ];

  // ─── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">

      {/* ── SIDEBAR ── */}
      <aside className="w-72 bg-white border-r hidden md:flex flex-col p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-10 text-green-700 font-extrabold text-2xl tracking-tight">
          <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-200">
            <GraduationCap className="text-white w-6 h-6" />
          </div>
          UOL Portal
        </div>

        <div className="space-y-6 flex-1">
          {/* Dept badge */}
          <div className="bg-green-50 p-4 rounded-2xl border border-green-100">
            <p className="text-[10px] text-green-600 uppercase font-bold tracking-widest mb-1">Current Department</p>
            <p className="font-bold text-gray-800 text-sm">{departmentName}</p>
          </div>

          {/* Nav */}
          <nav className="space-y-2">
            {[
              { id: 'knowledge', label: 'Knowledge Hub', icon: <Bot className="w-5 h-5" /> },
              { id: 'schedule', label: 'Campus Info', icon: <Bus className="w-5 h-5" /> },
            ].map(tab => (
              <Button
                key={tab.id}
                variant="ghost"
                onClick={() => setActiveTab(tab.id)}
                className={`w-full justify-start rounded-xl px-4 py-6 transition-all ${activeTab === tab.id ? 'font-bold text-green-700 bg-green-50 shadow-sm' : 'text-gray-500 hover:bg-green-50 hover:text-green-700'}`}
              >
                <span className="mr-3">{tab.icon}</span>{tab.label}
              </Button>
            ))}
          </nav>

          {/* Quick links */}
          <div className="pt-4 border-t">
            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-3">Quick Info</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: <Hotel className="w-4 h-4 text-orange-500" />, label: 'Hostels', q: 'Tell me about hostels at UOL' },
                { icon: <Coffee className="w-4 h-4 text-purple-500" />, label: 'Cafes', q: 'What cafes are at UOL?' },
                { icon: <Bus className="w-4 h-4 text-blue-500" />, label: 'Buses', q: 'What are the UOL bus routes?' },
                { icon: <GraduationCap className="w-4 h-4 text-green-600" />, label: 'Faculty', q: 'List all UOL faculties' },
              ].map(item => (
                <button
                  key={item.label}
                  onClick={() => { setInput(item.q); setActiveTab('knowledge'); }}
                  className="p-3 bg-white border border-gray-100 rounded-xl flex flex-col items-center gap-1 hover:border-green-400 hover:shadow-sm transition-all cursor-pointer"
                >
                  {item.icon}
                  <span className="text-[10px] font-bold text-gray-600">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Upload section */}
        <div className="mt-auto pt-4 border-t">
          <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-3">Share Resource</p>
          <input type="file" id="student-upload" className="hidden" onChange={handleFileUpload} accept=".pdf,.txt" />
          <label
            htmlFor="student-upload"
            className="flex items-center justify-center gap-2 text-xs p-3 bg-slate-50 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-green-500 hover:bg-green-50 hover:text-green-700 font-bold transition-all"
          >
            <Upload className="w-4 h-4" /> Upload PDF
          </label>
          {uploadStatus && <p className="text-[10px] mt-2 text-green-600 font-bold text-center">{uploadStatus}</p>}
        </div>
      </aside>

      {/* ── MAIN CHAT ── */}
      {activeTab === 'knowledge' && (
        <main className="flex-1 flex flex-col w-full p-6 overflow-hidden">
          <header className="mb-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-gray-800">UOL AI Assistant</h1>
              <p className="text-sm text-gray-400 font-medium">Trained on official UOL data · Speaks & Listens</p>
            </div>
            <div className="flex items-center gap-2">
              {isSpeaking && (
                <Button variant="outline" size="sm" onClick={stopSpeaking} className="text-xs rounded-full border-red-200 text-red-500 hover:bg-red-50">
                  <VolumeX className="w-3 h-3 mr-1" /> Stop Audio
                </Button>
              )}
              <Button variant="outline" size="icon" className="rounded-full shadow-sm">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </header>

          {/* Chat card */}
          <Card className="flex-1 border-none shadow-2xl bg-white rounded-3xl overflow-hidden flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4" ref={scrollRef}>
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex max-w-[85%] gap-3 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`h-9 w-9 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${m.role === 'user' ? 'bg-green-600 text-white' : 'bg-green-100 text-green-700'}`}>
                      {m.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                    </div>
                    <div className="group relative flex flex-col gap-1">
                      <div className={`p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${m.role === 'user'
                        ? 'bg-green-600 text-white rounded-tr-none shadow-md'
                        : 'bg-gray-50 border border-gray-100 rounded-tl-none text-gray-800'
                        }`}>
                        {m.image && (
                          <img src={m.image} alt="User attachment" className="max-w-xs rounded-xl mb-2" />
                        )}
                        {m.content}
                      </div>
                      {/* Listen button on bot messages */}
                      {m.role === 'assistant' && (
                        <button
                          onClick={() => speakText(m.content)}
                          className="self-start flex items-center gap-1 text-[10px] text-gray-400 hover:text-green-600 transition-colors font-bold px-1"
                          title="Listen to this message"
                        >
                          <Volume2 size={11} /> Listen
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-2xl bg-green-100 flex items-center justify-center text-green-700">
                      <Bot size={16} />
                    </div>
                    <div className="bg-gray-50 border p-4 rounded-2xl rounded-tl-none flex gap-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick prompts */}
            <div className="px-6 pb-2 flex flex-wrap gap-2">
              {quickPrompts.map(q => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  className="text-xs px-3 py-1.5 bg-green-50 text-green-700 border border-green-100 rounded-full hover:bg-green-100 transition-all font-medium"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Voice hint */}
            {listenHint && (
              <div className="px-6 pb-1">
                <p className={`text-xs font-bold px-3 py-2 rounded-xl ${isListening ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'}`}>
                  🎤 {listenHint}
                </p>
              </div>
            )}

            {/* Input bar */}
            <div className="p-4 bg-white border-t">
              {selectedImage && (
                <div className="relative inline-block mb-3">
                  <img src={selectedImage} alt="Preview" className="h-20 rounded-xl shadow-sm border border-gray-200" />
                  <button
                    onClick={() => setSelectedImage(null)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600"
                  >
                    <VolumeX className="w-3 h-3" />
                  </button>
                </div>
              )}
              <div className="flex gap-2 bg-gray-50 p-2 rounded-2xl border border-gray-100 focus-within:border-green-500 focus-within:ring-2 focus-within:ring-green-50 transition-all">
                <Input
                  ref={inputRef}
                  placeholder="Ask about HODs, buses, hostels, cafes…"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={loading}
                  className="flex-1 border-none bg-transparent focus-visible:ring-0 shadow-none text-sm font-medium"
                />

                {/* Image button */}
                <input type="file" id="image-upload" className="hidden" accept="image/*" onChange={handleImageUpload} />
                <label
                  htmlFor="image-upload"
                  className="p-2 cursor-pointer rounded-xl transition-all text-gray-400 hover:text-green-600 hover:bg-green-50 flex items-center justify-center"
                >
                  <Upload className="w-5 h-5" />
                </label>

                {/* Mic button */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={startListening}
                  title={isListening ? 'Stop listening' : 'Click to speak'}
                  className={`rounded-xl transition-all ${isListening
                    ? 'bg-red-100 text-red-600 animate-pulse shadow-lg shadow-red-100'
                    : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                    }`}
                >
                  {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </Button>

                {/* Send button */}
                <Button
                  id="send-btn"
                  onClick={handleSend}
                  size="icon"
                  disabled={loading || !input.trim()}
                  className="bg-green-600 hover:bg-green-700 rounded-xl shadow-md shadow-green-100 transition-all"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-center text-[10px] text-gray-300 mt-2">
                🎤 Click the mic to speak · 🔊 Click "Listen" on any answer to hear it
              </p>
            </div>
          </Card>
        </main>
      )}

      {/* ── CAMPUS INFO TAB ── */}
      {activeTab === 'schedule' && (
        <main className="flex-1 p-8 overflow-auto">
          <h1 className="text-3xl font-black mb-8 text-gray-800">Campus Logistics</h1>
          <div className="grid gap-6 md:grid-cols-2 max-w-4xl">
            <Card className="border-none shadow-md rounded-3xl overflow-hidden">
              <CardHeader className="bg-blue-600 text-white">
                <CardTitle className="flex items-center gap-3 text-lg"><Bus /> Bus Routes</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <ul className="space-y-3 text-sm text-gray-700">
                  {[
                    { route: 'Sheikhupura Route', time: '06:45 AM' },
                    { route: 'Kasur Route', time: '07:00 AM' },
                    { route: 'Raiwind Route', time: '07:15 AM' },
                    { route: 'Lahore City (Gulberg)', time: '07:30 AM' },
                  ].map(b => (
                    <li key={b.route} className="flex justify-between py-2 border-b last:border-0">
                      <span>{b.route}</span>
                      <span className="font-bold text-blue-600">{b.time}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-gray-400 mt-4">Register via OSA (EE1 Ground Floor) · Pay on SIS</p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md rounded-3xl overflow-hidden">
              <CardHeader className="bg-orange-500 text-white">
                <CardTitle className="flex items-center gap-3 text-lg"><Hotel /> Hostels</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <ul className="space-y-3 text-sm text-gray-700">
                  {[
                    { name: 'Razia Hall (On-Campus)', status: 'Open' },
                    { name: 'Fatima Hall (On-Campus)', status: 'Open' },
                    { name: 'Kulsoom Hall (Off-Campus)', status: 'Open' },
                    { name: 'Shahida Hall (Off-Campus)', status: 'Open' },
                  ].map(h => (
                    <li key={h.name} className="flex justify-between py-2 border-b last:border-0">
                      <span>{h.name}</span>
                      <span className="font-bold text-green-600">{h.status}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-gray-400 mt-4">24/7 Security · Wi-Fi · 3 Meals/Day</p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md rounded-3xl overflow-hidden">
              <CardHeader className="bg-purple-600 text-white">
                <CardTitle className="flex items-center gap-3 text-lg"><Coffee /> Cafes & Dining</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <ul className="space-y-3 text-sm text-gray-700">
                  {['Gloria Jean\'s', 'Main Café', 'Basement Café (EE2)', 'X2 Café', 'Sub Uni', 'Main Street Café'].map(c => (
                    <li key={c} className="py-2 border-b last:border-0">{c}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md rounded-3xl overflow-hidden">
              <CardHeader className="bg-green-600 text-white">
                <CardTitle className="flex items-center gap-3 text-lg"><GraduationCap /> Key Contacts</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <ul className="space-y-3 text-sm text-gray-700">
                  {[
                    { label: 'Office of Student Affairs (OSA)', value: 'EE1, Ground Floor' },
                    { label: 'University Counseling Center', value: 'Main Campus' },
                    { label: 'Transport Office', value: 'OSA — EE1' },
                    { label: 'Official Website', value: 'uol.edu.pk' },
                  ].map(c => (
                    <li key={c.label} className="py-2 border-b last:border-0">
                      <p className="font-semibold text-gray-800">{c.label}</p>
                      <p className="text-gray-500 text-xs">{c.value}</p>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </main>
      )}
    </div>
  );
}
