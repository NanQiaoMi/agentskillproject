import React from 'react';
import { 
  MessageSquare, CheckSquare, Users, GitBranch, Activity, Settings,
  AlertTriangle, Check, Monitor, Server, Database, FolderOpen, Loader,
  Plus, FileText, Code, Shield, Sun, Moon, ChevronDown, Send, Zap,
  Terminal, CheckCircle2, Copy, Search, RefreshCw, MoreHorizontal,
  Play, Edit2, ArrowLeft, BookOpen, Layout, Clock, ChevronRight, Link,
  Box, Trash2, Square, Grid, Maximize2, Minimize2, X, Bell, Command,
  Info, XCircle, ArrowRight, Star, Lightbulb, Network
} from 'lucide-react';

const SW = 1.75; // Premium stroke width

export const Icons = {
  Network: (props: React.SVGProps<SVGSVGElement>) => <Network strokeWidth={SW} {...props as any} />,
  // Sidebar Nav
  MessageSquare: (props: React.SVGProps<SVGSVGElement>) => <MessageSquare strokeWidth={SW} {...props as any} />,
  CheckSquare: (props: React.SVGProps<SVGSVGElement>) => <CheckSquare strokeWidth={SW} {...props as any} />,
  Users: (props: React.SVGProps<SVGSVGElement>) => <Users strokeWidth={SW} {...props as any} />,
  GitBranch: (props: React.SVGProps<SVGSVGElement>) => <GitBranch strokeWidth={SW} {...props as any} />,
  Activity: (props: React.SVGProps<SVGSVGElement>) => <Activity strokeWidth={SW} {...props as any} />,
  Settings: (props: React.SVGProps<SVGSVGElement>) => <Settings strokeWidth={SW} {...props as any} />,
  AlertTriangle: (props: React.SVGProps<SVGSVGElement>) => <AlertTriangle strokeWidth={SW} {...props as any} />,
  Check: (props: React.SVGProps<SVGSVGElement>) => <Check strokeWidth={SW} {...props as any} />,
  Monitor: (props: React.SVGProps<SVGSVGElement>) => <Monitor strokeWidth={SW} {...props as any} />,
  Server: (props: React.SVGProps<SVGSVGElement>) => <Server strokeWidth={SW} {...props as any} />,
  Database: (props: React.SVGProps<SVGSVGElement>) => <Database strokeWidth={SW} {...props as any} />,
  FolderOpen: (props: React.SVGProps<SVGSVGElement>) => <FolderOpen strokeWidth={SW} {...props as any} />,
  Loader: (props: React.SVGProps<SVGSVGElement>) => <Loader strokeWidth={SW} {...props as any} />,
  
  // App UI specific
  Plus: (props: React.SVGProps<SVGSVGElement>) => <Plus strokeWidth={SW} {...props as any} />,
  FileText: (props: React.SVGProps<SVGSVGElement>) => <FileText strokeWidth={SW} {...props as any} />,
  Code: (props: React.SVGProps<SVGSVGElement>) => <Code strokeWidth={SW} {...props as any} />,
  Shield: (props: React.SVGProps<SVGSVGElement>) => <Shield strokeWidth={SW} {...props as any} />,
  Sun: (props: React.SVGProps<SVGSVGElement>) => <Sun strokeWidth={SW} {...props as any} />,
  Moon: (props: React.SVGProps<SVGSVGElement>) => <Moon strokeWidth={SW} {...props as any} />,
  ChevronDown: (props: React.SVGProps<SVGSVGElement>) => <ChevronDown strokeWidth={SW} {...props as any} />,
  Send: (props: React.SVGProps<SVGSVGElement>) => <Send strokeWidth={SW} {...props as any} />,
  Zap: (props: React.SVGProps<SVGSVGElement>) => <Zap strokeWidth={SW} {...props as any} />,
  Terminal: (props: React.SVGProps<SVGSVGElement>) => <Terminal strokeWidth={SW} {...props as any} />,
  CheckCircle2: (props: React.SVGProps<SVGSVGElement>) => <CheckCircle2 strokeWidth={SW} {...props as any} />,
  Copy: (props: React.SVGProps<SVGSVGElement>) => <Copy strokeWidth={SW} {...props as any} />,
  Search: (props: React.SVGProps<SVGSVGElement>) => <Search strokeWidth={SW} {...props as any} />,
  RefreshCw: (props: React.SVGProps<SVGSVGElement>) => <RefreshCw strokeWidth={SW} {...props as any} />,
  MoreHorizontal: (props: React.SVGProps<SVGSVGElement>) => <MoreHorizontal strokeWidth={SW} {...props as any} />,
  Play: (props: React.SVGProps<SVGSVGElement>) => <Play strokeWidth={SW} {...props as any} />,

  Edit2: (props: React.SVGProps<SVGSVGElement>) => <Edit2 strokeWidth={SW} {...props as any} />,
  ArrowLeft: (props: React.SVGProps<SVGSVGElement>) => <ArrowLeft strokeWidth={SW} {...props as any} />,
  BookOpen: (props: React.SVGProps<SVGSVGElement>) => <BookOpen strokeWidth={SW} {...props as any} />,
  Layout: (props: React.SVGProps<SVGSVGElement>) => <Layout strokeWidth={SW} {...props as any} />,
  Clock: (props: React.SVGProps<SVGSVGElement>) => <Clock strokeWidth={SW} {...props as any} />,
  ChevronRight: (props: React.SVGProps<SVGSVGElement>) => <ChevronRight strokeWidth={SW} {...props as any} />,
  Link: (props: React.SVGProps<SVGSVGElement>) => <Link strokeWidth={SW} {...props as any} />,

  Box: (props: React.SVGProps<SVGSVGElement>) => <Box strokeWidth={SW} {...props as any} />,
  Trash2: (props: React.SVGProps<SVGSVGElement>) => <Trash2 strokeWidth={SW} {...props as any} />,
  Square: (props: React.SVGProps<SVGSVGElement>) => <Square strokeWidth={SW} {...props as any} />,
  Grid: (props: React.SVGProps<SVGSVGElement>) => <Grid strokeWidth={SW} {...props as any} />,
  Maximize2: (props: React.SVGProps<SVGSVGElement>) => <Maximize2 strokeWidth={SW} {...props as any} />,
  Minimize2: (props: React.SVGProps<SVGSVGElement>) => <Minimize2 strokeWidth={SW} {...props as any} />,
  X: (props: React.SVGProps<SVGSVGElement>) => <X strokeWidth={SW} {...props as any} />,
  Bell: (props: React.SVGProps<SVGSVGElement>) => <Bell strokeWidth={SW} {...props as any} />,
  Command: (props: React.SVGProps<SVGSVGElement>) => <Command strokeWidth={SW} {...props as any} />,
  Info: (props: React.SVGProps<SVGSVGElement>) => <Info strokeWidth={SW} {...props as any} />,
  XCircle: (props: React.SVGProps<SVGSVGElement>) => <XCircle strokeWidth={SW} {...props as any} />,
  ArrowRight: (props: React.SVGProps<SVGSVGElement>) => <ArrowRight strokeWidth={SW} {...props as any} />,
  Star: (props: React.SVGProps<SVGSVGElement>) => <Star strokeWidth={SW} {...props as any} />,
  Lightbulb: (props: React.SVGProps<SVGSVGElement>) => <Lightbulb strokeWidth={SW} {...props as any} />,
};
