import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase配置
const SUPABASE_URL = "https://jnzoquhmgpjbqcabgxrd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impuem9xdWhtZ3BqYnFjYWJneHJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1MDc4OTgsImV4cCI6MjA3MjA4Mzg5OH0.BKMFZNbTgGf5yxfAQuFbA912fISlbbL3GE6YDn-OkaA";

// 单例模式的Supabase客户端
let supabaseInstance: SupabaseClient | null = null;

/**
 * 获取Supabase客户端单例实例
 * @returns SupabaseClient实例
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return supabaseInstance;
}

/**
 * 重置Supabase客户端实例（主要用于测试或特殊情况）
 */
export function resetSupabaseClient(): void {
  supabaseInstance = null;
}