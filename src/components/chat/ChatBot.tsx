'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, 
  X, 
  Send, 
  User, 
  Bot, 
  Loader2, 
  Minimize2,
  Maximize2
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

interface Message {
  id: string;
  role: 'user' | 'bot';
  content: string;
  timestamp: Date;
}

export function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'bot',
      content: 'Xin chào! Tôi là trợ lý ảo của hệ thống quản lý phòng trọ. Tôi có thể giúp gì cho bạn hôm nay?',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!inputValue.trim() || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      // Chuẩn bị lịch sử chat cho API (bỏ tin nhắn đầu tiên chào mừng)
      const history = messages.slice(1).map(msg => ({
        role: msg.role === 'bot' ? 'assistant' : 'user',
        content: msg.content
      }));

      const response = await fetch('/api/chat/gemini-public', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputValue,
          history: history
        }),
      });

      const data = await response.json();

      if (data.success) {
        const botResponse: Message = {
          id: Date.now().toString(),
          role: 'bot',
          content: data.content,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, botResponse]);
      } else {
        throw new Error(data.message || 'Có lỗi xảy ra');
      }
    } catch (error) {
      console.error('Chat Error:', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'bot',
        content: 'Xin lỗi, tôi đang gặp chút sự cố kết nối. Bạn vui lòng thử lại sau giây lát nhé!',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20, width: '350px' }}
            animate={{ 
              opacity: 1, 
              scale: 1, 
              y: 0,
              height: isMinimized ? 'auto' : (isExpanded ? 'min(850px, 90vh)' : '650px'),
              width: isMinimized ? '500px' : (isExpanded ? 'min(1300px, 95vw)' : '550px')
            }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="mb-4 overflow-hidden rounded-2xl shadow-2xl border border-teal-100 bg-white/95 backdrop-blur-md"
          >
            <Card className="border-0 shadow-none bg-transparent h-full flex flex-col p-0 gap-0">
              <CardHeader className="pl-4 pr-6 py-4 bg-teal-500 text-white flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold">Hỗ trợ tìm phòng</CardTitle>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                      <span className="text-[10px] opacity-90">Đang trực tuyến</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {!isMinimized && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-white hover:bg-white/30 transition-colors"
                      onClick={() => setIsExpanded(!isExpanded)}
                      title={isExpanded ? "Thu nhỏ chiều rộng" : "Mở rộng chiều rộng"}
                    >
                      {isExpanded ? <Minimize2 className="h-5 w-5 rotate-90" /> : <Maximize2 className="h-5 w-5 rotate-90" />}
                    </Button>
                  )}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-white hover:bg-white/30 transition-colors"
                    onClick={() => {
                      setIsMinimized(!isMinimized);
                      if (!isMinimized) setIsExpanded(false);
                    }}
                    title={isMinimized ? "Phóng to" : "Thu nhỏ"}
                  >
                    {isMinimized ? <Maximize2 className="h-5 w-5" /> : <Minimize2 className="h-5 w-5" />}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-white hover:bg-red-500/80 transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </CardHeader>
              
              {!isMinimized && (
                <>
                  <CardContent className="flex-1 p-0 bg-slate-50/50 overflow-hidden">
                    <ScrollArea ref={scrollRef} className="h-full w-full p-4">
                      <div className="space-y-4">
                        {messages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`flex gap-2 items-start ${msg.role === 'user' ? 'max-w-[85%] flex-row-reverse' : (isExpanded ? 'w-full max-w-[98%]' : 'max-w-[85%]')}`}>
                              <Avatar className="w-8 h-8 flex-shrink-0 border border-teal-100 bg-white">
                                {msg.role === 'bot' ? (
                                  <AvatarFallback className="bg-teal-500 text-white"><Bot size={16} /></AvatarFallback>
                                ) : (
                                  <AvatarFallback className="bg-slate-200"><User size={16} /></AvatarFallback>
                                )}
                              </Avatar>
                              <div
                                className={`p-3 rounded-2xl text-sm shadow-sm overflow-x-auto ${
                                  isExpanded && msg.role === 'bot' ? 'w-full' : ''
                                } ${
                                  msg.role === 'user'
                                    ? 'bg-teal-500 text-white rounded-tr-none'
                                    : 'bg-white text-slate-700 border border-teal-50 rounded-tl-none'
                                }`}
                              >
                                {msg.role === 'bot' ? (
                                  <ReactMarkdown 
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                      table: ({node: _node, ...props}) => (
                                        <div className="overflow-x-auto my-2 rounded-lg border border-teal-100 bg-white">
                                          <table className="min-w-full divide-y divide-teal-100 text-xs" {...props} />
                                        </div>
                                      ),
                                      thead: ({node: _node, ...props}) => <thead className="bg-teal-50" {...props} />,
                                      th: ({node: _node, ...props}) => <th className="px-3 py-2 text-left font-bold text-teal-700 uppercase tracking-wider border-b border-teal-100" {...props} />,
                                      td: ({node: _node, ...props}) => <td className="px-3 py-2 border-b border-teal-50 leading-relaxed" {...props} />,
                                      tr: ({node: _node, ...props}) => <tr className="hover:bg-teal-50/10 transition-colors" {...props} />,
                                      p: ({node: _node, ...props}) => <p className="mb-1 last:mb-0" {...props} />,
                                      ul: ({node: _node, ...props}) => <ul className="list-disc ml-4 mb-2" {...props} />,
                                      li: ({node: _node, ...props}) => <li className="mb-0.5" {...props} />,
                                    }}
                                  >
                                    {msg.content}
                                  </ReactMarkdown>
                                ) : (
                                  msg.content
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        {isTyping && (
                          <div className="flex justify-start">
                            <div className="flex gap-2 items-center bg-white p-3 rounded-2xl border border-teal-50 shadow-sm rounded-tl-none">
                              <Loader2 className="w-4 h-4 animate-spin text-teal-500" />
                              <span className="text-xs text-slate-400">Bot đang trả lời...</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                  <CardFooter className="p-4 border-t bg-white">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSend();
                      }}
                      className="flex w-full gap-2 items-center"
                    >
                      <Input
                        placeholder="Hãy hỏi tôi điều gì đó..."
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        className="flex-1 border-slate-200 focus:ring-teal-500 rounded-xl"
                      />
                      <Button 
                        size="icon" 
                        type="submit"
                        className="bg-teal-500 hover:bg-teal-600 rounded-xl shadow-lg transition-all"
                        disabled={!inputValue.trim() || isTyping}
                      >
                        <Send className="h-4 w-4 text-white" />
                      </Button>
                    </form>
                  </CardFooter>
                </>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => {
          setIsOpen(!isOpen);
          setIsMinimized(false);
        }}
        className="w-14 h-14 rounded-full bg-teal-500 text-white shadow-xl flex items-center justify-center hover:bg-teal-600 transition-all border-4 border-white"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </motion.button>
    </div>
  );
}
