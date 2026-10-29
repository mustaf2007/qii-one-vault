/* ============================================================
 * QII One Vault — إعداد الاتصال بمشروع Supabase
 * ------------------------------------------------------------
 * ضع هنا بيانات *المشروع العام* فقط:
 *   - SUPABASE_URL:      من Dashboard → Project Settings → API
 *   - SUPABASE_ANON_KEY: المفتاح العام (anon / publishable)
 *
 * المفتاح العام (anon) مصمم أصلاً للاستخدام في المتصفح، وحمايته
 * تتم عبر RLS في قاعدة البيانات — أما مفتاح service_role فهو سري
 * ولا يوضع هنا أو في أي كود أمامي أبداً.
 * ============================================================ */
window.QII_VAULT_CONFIG = {
  SUPABASE_URL: "https://jmfrfmkacegkhjheadfl.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_UMDDqYWYE51SVktomnLqYg_nn87hIim"
};
