/* QII One Vault — منطق التطبيق (Supabase Auth + notes مع RLS) */
(function () {
  "use strict";

  var cfg = window.QII_VAULT_CONFIG || {};
  var isConfigured =
    typeof cfg.SUPABASE_URL === "string" &&
    cfg.SUPABASE_URL.indexOf("http") === 0 &&
    typeof cfg.SUPABASE_ANON_KEY === "string" &&
    cfg.SUPABASE_ANON_KEY.length > 20;

  var el = function (id) { return document.getElementById(id); };
  var setupNotice = el("setupNotice");
  var authView = el("authView");
  var vaultView = el("vaultView");
  var authForm = el("authForm");
  var authMessage = el("authMessage");
  var authSubmit = el("authSubmit");
  var tabLogin = el("tabLogin");
  var tabSignup = el("tabSignup");
  var signOutBtn = el("signOutBtn");
  var noteForm = el("noteForm");
  var noteMessage = el("noteMessage");
  var notesList = el("notesList");
  var emptyState = el("emptyState");
  var userEmail = el("userEmail");
  var rlsCheckBtn = el("rlsCheckBtn");
  var rlsResult = el("rlsResult");

  var mode = "login"; // login | signup
  var client = null;
  var user = null;

  function show(node) { node.classList.remove("hidden"); }
  function hide(node) { node.classList.add("hidden"); }

  if (!isConfigured) {
    show(setupNotice);
    return; // لا تعمل أي واجهة بيانات قبل الإعداد
  }

  client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

  /* ---------- تبويبات الدخول ---------- */
  function setMode(next) {
    mode = next;
    var login = next === "login";
    tabLogin.classList.toggle("active", login);
    tabSignup.classList.toggle("active", !login);
    tabLogin.setAttribute("aria-selected", String(login));
    tabSignup.setAttribute("aria-selected", String(!login));
    authSubmit.textContent = login ? "دخول" : "إنشاء الحساب";
    authMessage.textContent = "";
  }
  tabLogin.addEventListener("click", function () { setMode("login"); });
  tabSignup.addEventListener("click", function () { setMode("signup"); });

  /* ---------- تبديل العروض ---------- */
  function setView(signedIn) {
    if (signedIn) {
      hide(authView);
      show(vaultView);
      show(signOutBtn);
    } else {
      hide(vaultView);
      show(authView);
      hide(signOutBtn);
      rlsResult.textContent = "";
    }
  }

  /* ---------- المصادقة ---------- */
  authForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var email = el("email").value.trim();
    var password = el("password").value;
    authMessage.classList.remove("error", "ok");

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      authMessage.textContent = "يرجى إدخال بريد إلكتروني صحيح.";
      authMessage.classList.add("error");
      return;
    }
    if (password.length < 6) {
      authMessage.textContent = "كلمة المرور يجب ألّا تقل عن 6 أحرف.";
      authMessage.classList.add("error");
      return;
    }

    authSubmit.disabled = true;
    var task =
      mode === "login"
        ? client.auth.signInWithPassword({ email: email, password: password })
        : client.auth.signUp({ email: email, password: password });

    task
      .then(function (res) {
        if (res.error) {
          authMessage.textContent = res.error.message;
          authMessage.classList.add("error");
          return;
        }
        if (!res.data.session) {
          authMessage.textContent =
            "تم إنشاء الحساب. فعّل البريد الإلكتروني من رابط التأكيد، أو أغلق تأكيد البريد من لوحة Supabase ثم سجّل الدخول.";
          authMessage.classList.add("ok");
          return;
        }
        user = res.data.user;
        userEmail.textContent = user.email;
        setView(true);
        loadNotes();
      })
      .catch(function (err) {
        authMessage.textContent = "تعذّر الاتصال: " + err.message;
        authMessage.classList.add("error");
      })
      .then(function () { authSubmit.disabled = false; });
  });

  signOutBtn.addEventListener("click", function () {
    client.auth.signOut().then(function () {
      user = null;
      notesList.innerHTML = "";
      setView(false);
    });
  });

  /* ---------- الملاحظات ---------- */
  function renderNotes(rows) {
    notesList.innerHTML = "";
    emptyState.classList.toggle("hidden", rows.length > 0);
    rows.forEach(function (row) {
      var li = document.createElement("li");
      li.className = "note";

      var head = document.createElement("div");
      head.className = "note-head";
      var title = document.createElement("strong");
      title.textContent = row.title;
      var date = document.createElement("small");
      date.textContent = new Date(row.created_at).toLocaleString("ar");
      head.appendChild(title);
      head.appendChild(date);

      var body = document.createElement("p");
      body.textContent = row.body || "";

      var del = document.createElement("button");
      del.type = "button";
      del.className = "btn btn-ghost btn-small";
      del.textContent = "حذف";
      del.addEventListener("click", function () { deleteNote(row.id); });

      li.appendChild(head);
      li.appendChild(body);
      li.appendChild(del);
      notesList.appendChild(li);
    });
  }

  function loadNotes() {
    // لا نضيف فلتر user_id — RLS هو من يعزل الصفوف داخل قاعدة البيانات
    client
      .from("notes")
      .select("*")
      .order("created_at", { ascending: false })
      .then(function (res) {
        if (res.error) {
          noteMessage.textContent = res.error.message;
          noteMessage.classList.add("error");
          return;
        }
        renderNotes(res.data || []);
      });
  }

  noteForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var title = el("noteTitle").value.trim();
    noteMessage.classList.remove("error", "ok");
    if (!title) {
      noteMessage.textContent = "العنوان مطلوب.";
      noteMessage.classList.add("error");
      return;
    }
    // user_id يوضع تلقائياً بـ default auth.uid() في قاعدة البيانات
    client
      .from("notes")
      .insert({ title: title, body: el("noteBody").value.trim() })
      .then(function (res) {
        if (res.error) {
          noteMessage.textContent = res.error.message;
          noteMessage.classList.add("error");
          return;
        }
        el("noteTitle").value = "";
        el("noteBody").value = "";
        noteMessage.textContent = "تم الحفظ.";
        noteMessage.classList.add("ok");
        loadNotes();
      });
  });

  function deleteNote(id) {
    client
      .from("notes")
      .delete()
      .eq("id", id)
      .then(function (res) {
        if (res.error) {
          noteMessage.textContent = res.error.message;
          noteMessage.classList.add("error");
          return;
        }
        loadNotes();
      });
  }

  /* ---------- فحص العزل (RLS) ---------- */
  rlsCheckBtn.addEventListener("click", function () {
    rlsResult.classList.remove("ok", "error");
    rlsResult.textContent = "جارٍ الفحص...";
    Promise.all([
      client.from("notes").select("id, user_id"),
      client.from("notes").select("id, user_id").neq("user_id", user.id)
    ]).then(function (res) {
      var all = res[0], foreign = res[1];
      if (all.error || foreign.error) {
        rlsResult.textContent = "خطأ في الفحص: " + ((all.error || foreign.error).message);
        rlsResult.classList.add("error");
        return;
      }
      var total = (all.data || []).length;
      var foreignCount = (foreign.data || []).length;
      if (foreignCount === 0) {
        rlsResult.textContent =
          "✅ RLS يعمل: ترى " + total + " صفوف، وعدد الصفوف التي تخص مستخدمين آخرين = 0.";
        rlsResult.classList.add("ok");
      } else {
        rlsResult.textContent =
          "⚠️ تسريب محتمل: ظهر " + foreignCount + " صفوف لا تخص حسابك الحالي!";
        rlsResult.classList.add("error");
      }
    });
  });

  /* ---------- حالة الجلسة ---------- */
  client.auth.getSession().then(function (res) {
    var session = res.data && res.data.session;
    if (session && session.user) {
      user = session.user;
      userEmail.textContent = user.email;
      setView(true);
      loadNotes();
    } else {
      setView(false);
    }
  });

  client.auth.onAuthStateChange(function (_event, session) {
    if (!session && user) {
      user = null;
      notesList.innerHTML = "";
      setView(false);
    }
  });
})();
