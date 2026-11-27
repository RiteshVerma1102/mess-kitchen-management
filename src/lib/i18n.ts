import type { SupportedLanguage } from "@/lib/domain/workspace-types";

export const TRANSLATIONS: Record<
  SupportedLanguage,
  {
    appName: string;
    appTagline: string;
    liveMode: string;
    sampleMode: string;
    sampleModeBannerTitle: string;
    sampleModeBannerDesc: string;
    noWorkspaceBannerTitle: string;
    noWorkspaceBannerDesc: string;
    setupWorkspace: string;
    createAccount: string;
    signOut: string;
    askFoodFlow: string;
    searchModules: string;
    groups: {
      operations: string;
      resources: string;
      insights: string;
      counters: string;
      system: string;
    };
    pages: Record<string, string>;
    overview: {
      greetingMorning: string;
      greetingAfternoon: string;
      greetingEvening: string;
      subtitle: string;
      exportReport: string;
      planMeals: string;
      plannedMealsToday: string;
      expectedStudents: string;
      mealsServed: string;
      inventoryValue: string;
      costPerMeal: string;
      foodWaste: string;
      weeklyConsumption: string;
      todaySchedule: string;
      inventoryHealth: string;
      costWasteSnapshot: string;
      lowStockWatchlist: string;
      recentActivity: string;
      recommendations: string;
    };
    empty: {
      noStudentsTitle: string;
      noStudentsDesc: string;
      noMenuTitle: string;
      noMenuDesc: string;
      noInventoryTitle: string;
      noInventoryDesc: string;
      noOrdersTitle: string;
      noOrdersDesc: string;
      noWasteTitle: string;
      noWasteDesc: string;
      noInvoicesTitle: string;
      noInvoicesDesc: string;
      noTeamTitle: string;
      noTeamDesc: string;
      noAuditTitle: string;
      noAuditDesc: string;
      noFeedbackTitle: string;
      noFeedbackDesc: string;
    };
    actions: {
      addStudent: string;
      addIngredient: string;
      planMeal: string;
      addRecipe: string;
      addTask: string;
      newOrder: string;
      logWaste: string;
      addForecast: string;
      generateBills: string;
      recordPayment: string;
      inviteTeammate: string;
      save: string;
      saving: string;
      saved: string;
      cancel: string;
      refreshWeather: string;
      aiSuggestMenu: string;
      autoCreatePo: string;
      copyNextWeekMenu: string;
    };
    auth: {
      signIn: string;
      createWorkspace: string;
      welcomeBack: string;
      setupWorkspaceTitle: string;
      resetPassword: string;
      continueWithGoogle: string;
      rememberBrowser: string;
      forgotPassword: string;
      sendResetLink: string;
      verifyEmailTitle: string;
      resendVerification: string;
      checkVerification: string;
    };
    dataHealth: {
      title: string;
      subtitle: string;
      uidLabel: string;
      workspaceIdLabel: string;
      roleLabel: string;
      connectionLabel: string;
      lastWriteLabel: string;
      connected: string;
      offline: string;
      runTestWrite: string;
      runTestRead: string;
    };
    ai: {
      usageTitle: string;
      usageSubtitle: string;
      apiCallsLabel: string;
      cachedHitsLabel: string;
      fallbackCallsLabel: string;
      freeTierNote: string;
      predictTomorrow: string;
      menuSuggestions: string;
      wasteTips: string;
      feedbackSummary: string;
    };
    checklist: {
      title: string;
      subtitle: string;
      progressOf: string;
      dismiss: string;
      messHalls: string;
      mealTimings: string;
      planFee: string;
      firstMenu: string;
      inviteTeam: string;
    };
    ops: {
      loadingRole: string;
      cycleWeekA: string;
      cycleWeekB: string;
      applyCycleWeek: string;
      deductPrepStock: string;
      rationIndentTitle: string;
      tiffinBoardTitle: string;
      emergencyBroadcastTitle: string;
      postBroadcast: string;
      verifyQrTitle: string;
      scanPassBtn: string;
      vendorVarianceTitle: string;
      prepVsPlateTitle: string;
      printReceipt: string;
      minRebateRule: string;
      weeklyCommitteeReport: string;
      aiTopicSummary: string;
      moderationQueue: string;
      approve: string;
      hide: string;
      anonymousLabel: string;
      feastRsvp: string;
      rsvped: string;
    };
  }
> = {
  en: {
    appName: "FoodFlow",
    appTagline: "Institutional Kitchen OS",
    liveMode: "Live Mode",
    sampleMode: "Sample Mode",
    sampleModeBannerTitle: "You are exploring a read-only sample mess workspace.",
    sampleModeBannerDesc: "Illustrative numbers are isolated from your live Firestore records.",
    noWorkspaceBannerTitle: "Set up or join a mess workspace to start saving live records.",
    noWorkspaceBannerDesc:
      "Create your hostel workspace in 60 seconds or join with an invite code.",
    setupWorkspace: "Create Workspace",
    createAccount: "Switch to Live Account",
    signOut: "Sign out",
    askFoodFlow: "Ask FoodFlow",
    searchModules: "Search modules...",
    groups: {
      operations: "OPERATIONS",
      resources: "RESOURCES",
      insights: "INSIGHTS",
      counters: "COUNTERS & PORTAL",
      system: "SYSTEM & CONTROLS",
    },
    pages: {
      overview: "Overview",
      "meal-planning": "Meal planning",
      "weekly-menu": "Weekly menu",
      recipes: "Recipes & costing",
      kitchen: "Kitchen operations",
      inventory: "Inventory & expiry",
      purchasing: "Vendors & purchase orders",
      attendance: "QR attendance",
      students: "Students",
      forecast: "Demand & weather forecast",
      waste: "Food waste log",
      analytics: "Cost analytics",
      billing: "Monthly billing & payments",
      feedback: "Feedback & complaints",
      reports: "Reports & charts",
      notifications: "Notifications",
      users: "User management",
      settings: "Settings & Data Health",
      audit: "Audit logs",
      "kitchen-3d": "3D Kitchen Twin",
      student: "Student Dining Portal",
      halls: "Dining halls",
      suppliers: "Vendors directory",
      movements: "Stock movements",
      actuals: "Service actuals",
      calendar: "Academic calendar",
    },
    overview: {
      greetingMorning: "Good morning",
      greetingAfternoon: "Good afternoon",
      greetingEvening: "Good evening",
      subtitle: "Live operational pulse for your hostel kitchen and dining halls.",
      exportReport: "Export CSV",
      planMeals: "Plan meals",
      plannedMealsToday: "Planned meals today",
      expectedStudents: "Expected portions",
      mealsServed: "Meals scanned today",
      inventoryValue: "Inventory value",
      costPerMeal: "Cost per meal",
      foodWaste: "Food waste rate",
      weeklyConsumption: "Weekly meal consumption vs forecast",
      todaySchedule: "Today's kitchen schedule",
      inventoryHealth: "Inventory & expiry watchlist",
      costWasteSnapshot: "Cost & food-waste snapshot",
      lowStockWatchlist: "Below minimum stock",
      recentActivity: "Recent workspace activity",
      recommendations: "Smart operational tips",
    },
    empty: {
      noStudentsTitle: "No students yet. Add your first student",
      noStudentsDesc:
        "Add hostel students to manage meal plans, dining hall mapping, and monthly bills.",
      noMenuTitle: "No meal plans yet. Plan your first meal",
      noMenuDesc:
        "Publish breakfast, lunch, snacks, and dinner menus so students can book or skip before cut-off.",
      noInventoryTitle: "No ingredients in stock yet",
      noInventoryDesc:
        "Add rice, dal, dairy, and produce with minimum thresholds and expiry dates.",
      noOrdersTitle: "No purchase orders yet",
      noOrdersDesc: "Add vendors or auto-generate a purchase order from low-stock items.",
      noWasteTitle: "No food waste logged yet",
      noWasteDesc:
        "Log post-meal leftovers and spoilage to track cost leakage and waste percentage.",
      noInvoicesTitle: "No monthly bills generated yet",
      noInvoicesDesc:
        "Generate paise-accurate monthly student bills with automatic leave rebates and GST.",
      noTeamTitle: "No team members found",
      noTeamDesc:
        "Invite your Kitchen Head, Store Keeper, Accountant, or Students by email or invite code.",
      noAuditTitle: "No audit logs yet",
      noAuditDesc:
        "Every workspace creation, role assignment, stock adjustment, and billing action is logged here.",
      noFeedbackTitle: "No student feedback or complaints yet",
      noFeedbackDesc: "Student meal ratings and complaint tickets appear here with SLA tracking.",
    },
    actions: {
      addStudent: "Add student",
      addIngredient: "Add ingredient",
      planMeal: "Plan meal",
      addRecipe: "Add recipe",
      addTask: "Add prep task",
      newOrder: "New purchase order",
      logWaste: "Log waste",
      addForecast: "Add forecast",
      generateBills: "Generate monthly bills",
      recordPayment: "Record payment",
      inviteTeammate: "Invite member",
      save: "Save",
      saving: "Saving...",
      saved: "Saved",
      cancel: "Cancel",
      refreshWeather: "Sync Open-Meteo weather",
      aiSuggestMenu: "AI / Smart menu tips",
      autoCreatePo: "Auto-PO low stock",
      copyNextWeekMenu: "Copy today to tomorrow",
    },
    auth: {
      signIn: "Sign In",
      createWorkspace: "Create Workspace",
      welcomeBack: "Welcome back",
      setupWorkspaceTitle: "Create your FoodFlow workspace",
      resetPassword: "Reset your password",
      continueWithGoogle: "Continue with Google",
      rememberBrowser: "Remember this browser",
      forgotPassword: "Forgot password?",
      sendResetLink: "Send reset email",
      verifyEmailTitle: "Verify your email address",
      resendVerification: "Resend verification email",
      checkVerification: "I've verified my email",
    },
    dataHealth: {
      title: "Data Health & Firestore Diagnostics",
      subtitle:
        "Verify live multi-tenant authentication, workspace role, and Firestore read/write health.",
      uidLabel: "Authenticated UID",
      workspaceIdLabel: "Active Workspace ID",
      roleLabel: "Active Workspace Role",
      connectionLabel: "Firestore Connection",
      lastWriteLabel: "Last Successful Write",
      connected: "Connected",
      offline: "Offline / Blocked",
      runTestWrite: "Run test write",
      runTestRead: "Run test read",
    },
    ai: {
      usageTitle: "AI usage today",
      usageSubtitle:
        "Daily Gemini free-tier calls, cache saves, and formula fallbacks (resets midnight IST).",
      apiCallsLabel: "Gemini API calls today",
      cachedHitsLabel: "Cached answers reused",
      fallbackCallsLabel: "Formula fallbacks used",
      freeTierNote:
        "Key stored securely on server (/api/gemini/*) · Weather via keyless Open-Meteo",
      predictTomorrow: "Predict tomorrow (AI + Weather)",
      menuSuggestions: "AI Menu Suggestions",
      wasteTips: "AI Waste Tips",
      feedbackSummary: "AI Topic Summary",
    },
    checklist: {
      title: "Finish setting up your mess",
      subtitle: "Complete these 5 quick milestones to unlock full hostel operations.",
      progressOf: "of 5",
      dismiss: "Dismiss",
      messHalls: "Mess name & dining halls",
      mealTimings: "Meal timings & IST cut-off",
      planFee: "Monthly fee & leave rebate",
      firstMenu: "Publish first meal menu",
      inviteTeam: "Invite kitchen & hostel team",
    },
    ops: {
      loadingRole: "Loading role...",
      cycleWeekA: "Cycle Week A",
      cycleWeekB: "Cycle Week B",
      applyCycleWeek: "Apply Cycle",
      deductPrepStock: "Deduct Prep Stock",
      rationIndentTitle: "Daily Kitchen Ration Indent",
      tiffinBoardTitle: "Sick / Late Tiffin Dispatch Board",
      emergencyBroadcastTitle: "Mess Emergency Broadcast",
      postBroadcast: "Broadcast to All Students & Staff",
      verifyQrTitle: "Verify & Check-In Rotating QR Pass",
      scanPassBtn: "Verify & Check In",
      vendorVarianceTitle: "Vendor Spend & Price Variance",
      prepVsPlateTitle: "Prep vs Plate Waste Split",
      printReceipt: "Receipt",
      minRebateRule: "Min consecutive leave days for rebate",
      weeklyCommitteeReport: "Print Weekly Mess Committee Summary",
      aiTopicSummary: "AI Topic Summary",
      moderationQueue: "Moderation Queue",
      approve: "Approve",
      hide: "Hide",
      anonymousLabel: "Anonymous Student",
      feastRsvp: "RSVP for Feast",
      rsvped: "RSVP Confirmed",
    },
  },
  hi: {
    appName: "फूडफ्लो (FoodFlow)",
    appTagline: "संस्थागत रसोई प्रबंधन प्रणाली",
    liveMode: "लाइव डेटा मोड",
    sampleMode: "सैंपल मोड",
    sampleModeBannerTitle: "आप एक रीड-ओनली सैंपल मेस वर्कस्पेस देख रहे हैं।",
    sampleModeBannerDesc: "ये उदाहरण संख्याएं आपके वास्तविक Firestore डेटा से पूरी तरह अलग हैं।",
    noWorkspaceBannerTitle: "लाइव डेटा सहेजने के लिए मेस वर्कस्पेस बनाएं या जुड़ें।",
    noWorkspaceBannerDesc: "60 सेकंड में नया हॉस्टल मेस बनाएं या आमंत्रण कोड से जुड़ें।",
    setupWorkspace: "नया वर्कस्पेस बनाएं",
    createAccount: "लाइव खाते पर जाएं",
    signOut: "लॉग आउट",
    askFoodFlow: "फूडफ्लो AI सहायक",
    searchModules: "मॉड्यूल खोजें...",
    groups: {
      operations: "दैनिक संचालन",
      resources: "संसाधन और छात्र",
      insights: "विश्लेषण और बिलिंग",
      counters: "काउंटर और पोर्टल",
      system: "सिस्टम और नियंत्रण",
    },
    pages: {
      overview: "डैशबोर्ड सारांश",
      "meal-planning": "भोजन योजना",
      "weekly-menu": "साप्ताहिक मेनू",
      recipes: "रेसिपी और लागत",
      kitchen: "रसोई कार्य",
      inventory: "इन्वेंटरी और एक्सपायरी",
      purchasing: "विक्रेता और क्रय आदेश (PO)",
      attendance: "क्यूआर उपस्थिति",
      students: "छात्र सूची",
      forecast: "मांग और मौसम पूर्वानुमान",
      waste: "भोजन अपव्यय लॉग",
      analytics: "लागत विश्लेषण",
      billing: "मासिक बिल और भुगतान",
      feedback: "फीडबैक और शिकायतें",
      reports: "रिपोर्ट और चार्ट",
      notifications: "सूचनाएं",
      users: "टीम और भूमिकाएं",
      settings: "सेटिंग्स और डेटा हेल्थ",
      audit: "ऑडिट लॉग",
      "kitchen-3d": "3D किचन ट्विन",
      student: "छात्र डाइनिंग पोर्टल",
      halls: "डाइनिंग हॉल",
      suppliers: "विक्रेता निर्देशिका",
      movements: "स्टॉक मूवमेंट",
      actuals: "वास्तविक सेवा डेटा",
      calendar: "शैक्षणिक कैलेंडर",
    },
    overview: {
      greetingMorning: "सुप्रभात",
      greetingAfternoon: "नमस्कार",
      greetingEvening: "शुभ संध्या",
      subtitle: "आपके हॉस्टल किचन और डाइनिंग हॉल का लाइव संचालन विवरण।",
      exportReport: "CSV डाउनलोड",
      planMeals: "भोजन प्लान करें",
      plannedMealsToday: "आज के नियोजित भोजन",
      expectedStudents: "अपेक्षित थालियां",
      mealsServed: "आज के QR स्कैन",
      inventoryValue: "कुल स्टॉक मूल्य",
      costPerMeal: "प्रति थाली लागत",
      foodWaste: "भोजन अपव्यय दर",
      weeklyConsumption: "साप्ताहिक खपत बनाम पूर्वानुमान",
      todaySchedule: "आज का रसोई शेड्यूल",
      inventoryHealth: "कम स्टॉक और एक्सपायरी अलर्ट",
      costWasteSnapshot: "लागत और अपव्यय सारांश",
      lowStockWatchlist: "न्यूनतम स्टॉक से कम सामग्री",
      recentActivity: "हाल की गतिविधि",
      recommendations: "स्मार्ट रसोई सुझाव",
    },
    empty: {
      noStudentsTitle: "अभी कोई छात्र नहीं है। अपना पहला छात्र जोड़ें",
      noStudentsDesc: "भोजन योजना, डाइनिंग हॉल और मासिक बिल के लिए हॉस्टल छात्र जोड़ें।",
      noMenuTitle: "अभी कोई भोजन योजना नहीं है। पहला मेनू बनाएं",
      noMenuDesc: "नाश्ता, दोपहर और रात का मेनू प्रकाशित करें ताकि छात्र समय से बुकिंग या स्किप कर सकें।",
      noInventoryTitle: "स्टॉक में अभी कोई सामग्री नहीं है",
      noInventoryDesc: "न्यूनतम सीमा और एक्सपायरी तिथि के साथ चावल, दाल, दूध और सब्जियां जोड़ें।",
      noOrdersTitle: "अभी कोई क्रय आदेश (PO) नहीं है",
      noOrdersDesc: "विक्रेता जोड़ें या कम स्टॉक से सीधे ऑटो-PO बनाएं।",
      noWasteTitle: "अभी कोई भोजन अपव्यय दर्ज नहीं है",
      noWasteDesc: "लागत और अपव्यय प्रतिशत मापने के लिए बचे भोजन का वजन दर्ज करें।",
      noInvoicesTitle: "अभी कोई मासिक बिल नहीं बना है",
      noInvoicesDesc: "अवकाश छूट और GST के साथ पैसे-सटीक मासिक बिल तैयार करें।",
      noTeamTitle: "अभी कोई टीम सदस्य नहीं है",
      noTeamDesc: "ईमेल या आमंत्रण कोड द्वारा रसोई प्रमुख, भंडारपाल, लेखाकार या छात्रों को आमंत्रित करें।",
      noAuditTitle: "अभी कोई ऑडिट लॉग नहीं है",
      noAuditDesc: "हर भूमिका परिवर्तन, स्टॉक अपडेट और भुगतान यहां सुरक्षित दर्ज होता है।",
      noFeedbackTitle: "अभी कोई फीडबैक या शिकायत नहीं है",
      noFeedbackDesc: "छात्रों की भोजन रेटिंग और शिकायतें SLA ट्रैकिंग के साथ यहां दिखेंगी।",
    },
    actions: {
      addStudent: "छात्र जोड़ें",
      addIngredient: "सामग्री जोड़ें",
      planMeal: "मेनू जोड़ें",
      addRecipe: "रेसिपी जोड़ें",
      addTask: "रसोई कार्य जोड़ें",
      newOrder: "नया PO बनाएं",
      logWaste: "अपव्यय दर्ज करें",
      addForecast: "पूर्वानुमान जोड़ें",
      generateBills: "मासिक बिल बनाएं",
      recordPayment: "भुगतान दर्ज करें",
      inviteTeammate: "सदस्य आमंत्रित करें",
      save: "सहेजें",
      saving: "सहेजा जा रहा है...",
      saved: "सहेजा गया",
      cancel: "रद्द करें",
      refreshWeather: "Open-Meteo मौसम अपडेट",
      aiSuggestMenu: "स्मार्ट मेनू सुझाव",
      autoCreatePo: "कम स्टॉक का ऑटो-PO",
      copyNextWeekMenu: "आज का मेनू कल कॉपी करें",
    },
    auth: {
      signIn: "साइन इन करें",
      createWorkspace: "नया वर्कस्पेस बनाएं",
      welcomeBack: "वापसी पर स्वागत है",
      setupWorkspaceTitle: "अपना फूडफ्लो वर्कस्पेस बनाएं",
      resetPassword: "पासवर्ड रीसेट करें",
      continueWithGoogle: "Google से जारी रखें",
      rememberBrowser: "इस ब्राउज़र को याद रखें",
      forgotPassword: "पासवर्ड भूल गए?",
      sendResetLink: "रीसेट ईमेल भेजें",
      verifyEmailTitle: "अपना ईमेल सत्यापित करें",
      resendVerification: "सत्यापन ईमेल पुनः भेजें",
      checkVerification: "मैंने ईमेल सत्यापित कर लिया है",
    },
    dataHealth: {
      title: "डेटा हेल्थ और Firestore जांच",
      subtitle: "अपनी लाइव प्रमाणीकरण स्थिति, वर्कस्पेस भूमिका और Firestore रीड/राइट जांचें।",
      uidLabel: "सत्यापित UID",
      workspaceIdLabel: "सक्रिय वर्कस्पेस ID",
      roleLabel: "आपकी भूमिका (Role)",
      connectionLabel: "Firestore कनेक्शन",
      lastWriteLabel: "अंतिम सफल लेखन",
      connected: "जुड़ा हुआ (Connected)",
      offline: "ऑफ़लाइन / अवरुद्ध",
      runTestWrite: "टेस्ट राइट चलाएं",
      runTestRead: "टेस्ट रीड चलाएं",
    },
    ai: {
      usageTitle: "आज का AI उपयोग (AI usage today)",
      usageSubtitle: "दैनिक Gemini फ्री-टियर कॉल, कैश बचत और फ़ॉर्मूला फ़ॉलबैक (IST मध्यरात्रि रीसेट)।",
      apiCallsLabel: "आज के Gemini API कॉल",
      cachedHitsLabel: "कैश से प्राप्त उत्तर",
      fallbackCallsLabel: "फ़ॉर्मूला फ़ॉलबैक उपयोग",
      freeTierNote: "API कुंजी सर्वर (/api/gemini/*) पर सुरक्षित · बिना-कुंजी Open-Meteo मौसम",
      predictTomorrow: "कल की मांग अनुमान (AI + मौसम)",
      menuSuggestions: "AI मेनू सुझाव",
      wasteTips: "AI अपव्यय सुझाव",
      feedbackSummary: "AI विषय सारांश",
    },
    checklist: {
      title: "अपना मेस सेटअप पूरा करें",
      subtitle: "पूर्ण हॉस्टल संचालन के लिए ये 5 चरण पूरे करें।",
      progressOf: "में से 5",
      dismiss: "हटाएं",
      messHalls: "मेस का नाम और डाइनिंग हॉल",
      mealTimings: "भोजन समय और IST कट-ऑफ",
      planFee: "मासिक शुल्क और अवकाश छूट",
      firstMenu: "पहला भोजन मेनू प्रकाशित करें",
      inviteTeam: "रसोई और हॉस्टल टीम को आमंत्रित करें",
    },
    ops: {
      loadingRole: "भूमिका लोड हो रही है...",
      cycleWeekA: "चक्र सप्ताह A",
      cycleWeekB: "चक्र सप्ताह B",
      applyCycleWeek: "चक्र लागू करें",
      deductPrepStock: "स्टॉक से घटाएं",
      rationIndentTitle: "दैनिक रसोई राशन इंडेंट",
      tiffinBoardTitle: "बीमार / विलंबित टिफिन डिस्पैच बोर्ड",
      emergencyBroadcastTitle: "मेस आपातकालीन प्रसारण (Broadcast)",
      postBroadcast: "सभी छात्रों और स्टाफ को भेजें",
      verifyQrTitle: "रोटेटिंग QR पास सत्यापित करें",
      scanPassBtn: "सत्यापित करें और चेक-इन",
      vendorVarianceTitle: "विक्रेता व्यय और मूल्य अंतर",
      prepVsPlateTitle: "तैयारी बनाम थाली अपव्यय विभाजन",
      printReceipt: "रसीद",
      minRebateRule: "छूट के लिए न्यूनतम लगातार अवकाश दिन",
      weeklyCommitteeReport: "साप्ताहिक मेस समिति सारांश प्रिंट करें",
      aiTopicSummary: "AI विषय सारांश",
      moderationQueue: "मॉडरेशन कतार",
      approve: "स्वीकृत करें",
      hide: "छुपाएं",
      anonymousLabel: "गुमनाम छात्र",
      feastRsvp: "विशेष भोज RSVP",
      rsvped: "RSVP पुष्टि",
    },
  },
};

export function useTranslations(lang: SupportedLanguage) {
  return TRANSLATIONS[lang];
}
