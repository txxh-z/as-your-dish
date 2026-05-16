import {
  TARGET_LANGUAGE_KEYS,
  TARGET_LANGUAGE_LABELS,
  type Allergen,
  type DietaryTag,
  type FlavorProfile,
  type TargetLanguage,
} from '@as-your-dish/shared';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

const STORAGE_KEY = 'as-your-dish:language';

export const LOCALES: Record<TargetLanguage, string> = {
  zh: 'zh-CN',
  en: 'en-US',
  ko: 'ko-KR',
};

export const ALLERGEN_LABELS_I18N: Record<
  TargetLanguage,
  Record<Allergen, string>
> = {
  zh: {
    shellfish: '贝类',
    peanuts: '花生',
    dairy: '乳制品',
    gluten: '麸质',
    eggs: '蛋',
    soy: '大豆',
    tree_nuts: '坚果',
    fish: '鱼',
    sesame: '芝麻',
  },
  en: {
    shellfish: 'Shellfish',
    peanuts: 'Peanuts',
    dairy: 'Dairy',
    gluten: 'Gluten',
    eggs: 'Eggs',
    soy: 'Soy',
    tree_nuts: 'Tree nuts',
    fish: 'Fish',
    sesame: 'Sesame',
  },
  ko: {
    shellfish: '갑각류/조개류',
    peanuts: '땅콩',
    dairy: '유제품',
    gluten: '글루텐',
    eggs: '달걀',
    soy: '대두',
    tree_nuts: '견과류',
    fish: '생선',
    sesame: '참깨',
  },
};

export const DIETARY_LABELS_I18N: Record<
  TargetLanguage,
  Record<DietaryTag, string>
> = {
  zh: {
    vegetarian: '素食',
    vegan: '纯素',
    halal: '清真',
    kosher: '犹太洁食',
    contains_alcohol: '含酒精',
    contains_pork: '含猪肉',
    gluten_free: '无麸质',
  },
  en: {
    vegetarian: 'Vegetarian',
    vegan: 'Vegan',
    halal: 'Halal',
    kosher: 'Kosher',
    contains_alcohol: 'Contains alcohol',
    contains_pork: 'Contains pork',
    gluten_free: 'Gluten-free',
  },
  ko: {
    vegetarian: '채식',
    vegan: '비건',
    halal: '할랄',
    kosher: '코셔',
    contains_alcohol: '알코올 포함',
    contains_pork: '돼지고기 포함',
    gluten_free: '글루텐 프리',
  },
};

export const FLAVOR_LABELS_I18N: Record<
  TargetLanguage,
  Record<keyof FlavorProfile, string>
> = {
  zh: {
    salty: '咸',
    sour: '酸',
    sweet: '甜',
    bitter: '苦',
    spicy: '辣',
    umami: '鲜',
  },
  en: {
    salty: 'Salty',
    sour: 'Sour',
    sweet: 'Sweet',
    bitter: 'Bitter',
    spicy: 'Spicy',
    umami: 'Umami',
  },
  ko: {
    salty: '짠맛',
    sour: '신맛',
    sweet: '단맛',
    bitter: '쓴맛',
    spicy: '매운맛',
    umami: '감칠맛',
  },
};

export const EXAMPLE_LABELS_I18N: Record<
  TargetLanguage,
  Record<string, string>
> = {
  zh: {
    'chinese-home-cooking': '中式家常菜',
    'italian-trattoria': '意式小餐馆',
    'japanese-izakaya': '日式居酒屋',
  },
  en: {
    'chinese-home-cooking': 'Chinese home cooking',
    'italian-trattoria': 'Italian trattoria',
    'japanese-izakaya': 'Japanese izakaya',
  },
  ko: {
    'chinese-home-cooking': '중식 가정식',
    'italian-trattoria': '이탈리아 트라토리아',
    'japanese-izakaya': '일식 이자카야',
  },
};

const COPY = {
  zh: {
    language: '语言',
    auth: {
      login: '登录',
      loggingIn: '登录中',
      register: '注册',
      registering: '注册中',
      history: '历史',
      logout: '退出',
      email: '邮箱',
      password: '密码',
      noAccount: '没有账号？',
      hasAccount: '已有账号？',
      loginFailed: '登录失败',
      registerFailed: '注册失败',
      invalidEmail: '请输入有效邮箱',
      passwordMin: '密码至少 8 位',
      passwordMax: '密码过长',
      registerNote: '我们会保存你的菜单历史，可在档案页一键清空。',
      checking: '正在检查登录状态',
    },
    home: {
      title: '菜单翻译助手',
      output: '本次输出',
      imageLimit: '图片上限',
      imageLimitValue: '5 张',
      resultFields: '结果字段',
      resultFieldsValue: '原菜名 / 译名 / 配图 / 用料',
      cache: '缓存',
      cacheValue: '同图同语言秒返',
      analyzeFailed: '分析失败',
    },
    llm: {
      provider: '服务商',
      model: '模型',
    },
    uploader: {
      title: '图片上传',
      fileTypes: 'JPG / PNG / WEBP',
      camera: '拍照',
      choose: '选择图片',
      tryExample: '试用示例',
      clear: '清空',
      remove: (name: string) => `移除 ${name}`,
      analyzing: '分析中',
      submit: '上传分析',
      selected: (count: number, max: number, mb: string) =>
        `${count}/${max} 张 · ${mb} MB`,
    },
    result: {
      emptyTitle: '没有可显示的结果',
      emptyDescription: '请先上传菜单图片，或从历史记录重新打开一份结果。',
      backToUpload: '返回上传',
      dishCount: (count: number) => `${count} 道菜`,
      reupload: '重新上传',
      exampleNotice: '这是示例菜单，分析自己的菜单请在首页上传。',
      detectedLanguage: '菜单语言',
      cache: '缓存',
      cacheHit: '命中',
      cacheMiss: '未命中',
      model: '模型',
      token: 'Token',
    },
    dish: {
      originalName: '原始菜名',
      ingredients: '用料',
      disclaimer: '本应用结果仅供参考，重要过敏请向服务员二次确认',
      lowConfidence: '此菜识别不确定，请向服务员核实',
    },
    profile: {
      title: '个人档案',
      currentAccount: '当前账号',
      loading: '正在加载档案',
      saveFailed: '保存失败',
      saved: '已保存',
      clearConfirm: '确认清空所有菜单历史？',
      cleared: (count: number) => `已清空 ${count} 条历史`,
      save: '保存档案',
      saving: '保存中',
      backToUpload: '返回上传',
      clearHistory: '清空历史',
      clearing: '清空中',
      allergens: '过敏原',
      dietary: '饮食偏好',
      flavorLimit: '口味上限',
      spicyMax: (value: number) => `辣度最高 ${value}`,
    },
    history: {
      title: '菜单历史',
      loading: '正在加载历史',
      loadFailed: '加载失败',
      emptyTitle: '暂无历史记录',
      emptyDescription: '上传并分析菜单后，它会出现在这里。',
      upload: '上传菜单',
      unnamed: '未命名菜单',
      dishCount: (count: number) => `${count} 道菜`,
      opening: '打开中',
      view: '查看',
    },
    examples: {
      title: '试用示例菜单',
      description: '这是示例菜单，分析自己的菜单请在首页上传。',
      loading: '正在加载示例菜单',
      empty: '暂无示例菜单。请先运行 seed 脚本生成示例数据。',
      loadFailed: '示例菜单加载失败',
      fallback: '示例菜单',
      opening: '打开中',
      dishCount: (count: number) => `${count} 道菜`,
    },
    apiKey: {
      invalid: (provider: string) => `请输入有效的 ${provider} API key。`,
      title: '本月免费额度已用完',
      description: (provider: string) =>
        `可填入你自己的 ${provider} key 继续分析菜单。`,
      invalidTitle: 'API key 无效',
      invalidDescription: (provider: string) =>
        `浏览器里保存的 ${provider} key 被拒绝了。请粘贴新的 key，或关闭此窗口后改用服务端额度。`,
      label: (provider: string) => `${provider} key`,
      later: '稍后',
      saveAndRetry: '保存并重试',
    },
    warning: {
      allergen: (evidence: string, allergen: string) =>
        `含 ${evidence}（您已声明对 ${allergen} 过敏）`,
      dietary: (reason: string, evidence: string) =>
        `${reason}（证据：${evidence}）`,
      separator: '、',
    },
    common: {
      close: '关闭',
    },
  },
  en: {
    language: 'Language',
    auth: {
      login: 'Log in',
      loggingIn: 'Logging in',
      register: 'Sign up',
      registering: 'Signing up',
      history: 'History',
      logout: 'Log out',
      email: 'Email',
      password: 'Password',
      noAccount: 'No account?',
      hasAccount: 'Already have an account?',
      loginFailed: 'Login failed',
      registerFailed: 'Sign-up failed',
      invalidEmail: 'Enter a valid email',
      passwordMin: 'Password must be at least 8 characters',
      passwordMax: 'Password is too long',
      registerNote: 'Menu history is saved to your account and can be cleared from Profile.',
      checking: 'Checking login status',
    },
    home: {
      title: 'Menu translation assistant',
      output: 'This analysis',
      imageLimit: 'Image limit',
      imageLimitValue: '5 images',
      resultFields: 'Result fields',
      resultFieldsValue: 'Original / translation / image / ingredients',
      cache: 'Cache',
      cacheValue: 'Instant for same image and language',
      analyzeFailed: 'Analysis failed',
    },
    llm: {
      provider: 'Provider',
      model: 'Model',
    },
    uploader: {
      title: 'Upload images',
      fileTypes: 'JPG / PNG / WEBP',
      camera: 'Camera',
      choose: 'Choose images',
      tryExample: 'Try sample',
      clear: 'Clear',
      remove: (name: string) => `Remove ${name}`,
      analyzing: 'Analyzing',
      submit: 'Upload and analyze',
      selected: (count: number, max: number, mb: string) =>
        `${count}/${max} images · ${mb} MB`,
    },
    result: {
      emptyTitle: 'No result to show',
      emptyDescription: 'Upload menu images first, or reopen a result from history.',
      backToUpload: 'Back to upload',
      dishCount: (count: number) => `${count} dishes`,
      reupload: 'Upload again',
      exampleNotice: 'This is a sample menu. Upload your own menu from the home page.',
      detectedLanguage: 'Menu language',
      cache: 'Cache',
      cacheHit: 'Hit',
      cacheMiss: 'Miss',
      model: 'Model',
      token: 'Tokens',
    },
    dish: {
      originalName: 'Original name',
      ingredients: 'Ingredients',
      disclaimer: 'For reference only. Confirm important allergy concerns with staff.',
      lowConfidence: 'Identification is uncertain. Please confirm with staff.',
    },
    profile: {
      title: 'Profile',
      currentAccount: 'Current account',
      loading: 'Loading profile',
      saveFailed: 'Save failed',
      saved: 'Saved',
      clearConfirm: 'Clear all menu history?',
      cleared: (count: number) => `Cleared ${count} history items`,
      save: 'Save profile',
      saving: 'Saving',
      backToUpload: 'Back to upload',
      clearHistory: 'Clear history',
      clearing: 'Clearing',
      allergens: 'Allergens',
      dietary: 'Dietary preferences',
      flavorLimit: 'Flavor limit',
      spicyMax: (value: number) => `Max spice ${value}`,
    },
    history: {
      title: 'Menu history',
      loading: 'Loading history',
      loadFailed: 'Load failed',
      emptyTitle: 'No history yet',
      emptyDescription: 'Uploaded menu analyses will appear here.',
      upload: 'Upload menu',
      unnamed: 'Untitled menu',
      dishCount: (count: number) => `${count} dishes`,
      opening: 'Opening',
      view: 'View',
    },
    examples: {
      title: 'Try a sample menu',
      description: 'This is a sample menu. Upload your own menu from the home page.',
      loading: 'Loading sample menus',
      empty: 'No sample menus yet. Run the seed script first.',
      loadFailed: 'Sample menu failed to load',
      fallback: 'Sample menu',
      opening: 'Opening',
      dishCount: (count: number) => `${count} dishes`,
    },
    apiKey: {
      invalid: (provider: string) => `Enter a valid ${provider} API key.`,
      title: 'Monthly free quota is used up',
      description: (provider: string) =>
        `Add your own ${provider} key to keep analyzing menus.`,
      invalidTitle: 'API key is invalid',
      invalidDescription: (provider: string) =>
        `The ${provider} key saved in this browser was rejected. Paste a new key, or close this dialog to use the server quota.`,
      label: (provider: string) => `${provider} key`,
      later: 'Later',
      saveAndRetry: 'Save and retry',
    },
    warning: {
      allergen: (evidence: string, allergen: string) =>
        `Contains ${evidence} (you declared a ${allergen} allergy)`,
      dietary: (reason: string, evidence: string) =>
        `${reason} (evidence: ${evidence})`,
      separator: ', ',
    },
    common: {
      close: 'Close',
    },
  },
  ko: {
    language: '언어',
    auth: {
      login: '로그인',
      loggingIn: '로그인 중',
      register: '가입',
      registering: '가입 중',
      history: '기록',
      logout: '로그아웃',
      email: '이메일',
      password: '비밀번호',
      noAccount: '계정이 없나요?',
      hasAccount: '이미 계정이 있나요?',
      loginFailed: '로그인 실패',
      registerFailed: '가입 실패',
      invalidEmail: '올바른 이메일을 입력하세요',
      passwordMin: '비밀번호는 8자 이상이어야 합니다',
      passwordMax: '비밀번호가 너무 깁니다',
      registerNote: '메뉴 기록은 계정에 저장되며 프로필에서 한 번에 지울 수 있습니다.',
      checking: '로그인 상태 확인 중',
    },
    home: {
      title: '메뉴 번역 도우미',
      output: '이번 분석',
      imageLimit: '이미지 제한',
      imageLimitValue: '5장',
      resultFields: '결과 항목',
      resultFieldsValue: '원문 / 번역 / 이미지 / 재료',
      cache: '캐시',
      cacheValue: '같은 이미지와 언어는 즉시 반환',
      analyzeFailed: '분석 실패',
    },
    llm: {
      provider: '제공자',
      model: '모델',
    },
    uploader: {
      title: '이미지 업로드',
      fileTypes: 'JPG / PNG / WEBP',
      camera: '촬영',
      choose: '이미지 선택',
      tryExample: '샘플 보기',
      clear: '비우기',
      remove: (name: string) => `${name} 제거`,
      analyzing: '분석 중',
      submit: '업로드 후 분석',
      selected: (count: number, max: number, mb: string) =>
        `${count}/${max}장 · ${mb} MB`,
    },
    result: {
      emptyTitle: '표시할 결과가 없습니다',
      emptyDescription: '먼저 메뉴 이미지를 업로드하거나 기록에서 다시 열어 주세요.',
      backToUpload: '업로드로 돌아가기',
      dishCount: (count: number) => `${count}개 메뉴`,
      reupload: '다시 업로드',
      exampleNotice: '샘플 메뉴입니다. 직접 분석하려면 홈에서 메뉴를 업로드하세요.',
      detectedLanguage: '메뉴 언어',
      cache: '캐시',
      cacheHit: '적중',
      cacheMiss: '미적중',
      model: '모델',
      token: '토큰',
    },
    dish: {
      originalName: '원래 메뉴명',
      ingredients: '재료',
      disclaimer: '참고용 결과입니다. 중요한 알레르기는 직원에게 다시 확인하세요.',
      lowConfidence: '식별이 불확실합니다. 직원에게 확인하세요.',
    },
    profile: {
      title: '프로필',
      currentAccount: '현재 계정',
      loading: '프로필 불러오는 중',
      saveFailed: '저장 실패',
      saved: '저장됨',
      clearConfirm: '모든 메뉴 기록을 지울까요?',
      cleared: (count: number) => `기록 ${count}개 삭제됨`,
      save: '프로필 저장',
      saving: '저장 중',
      backToUpload: '업로드로 돌아가기',
      clearHistory: '기록 지우기',
      clearing: '지우는 중',
      allergens: '알레르기 유발 성분',
      dietary: '식이 선호',
      flavorLimit: '맛 제한',
      spicyMax: (value: number) => `최대 매운맛 ${value}`,
    },
    history: {
      title: '메뉴 기록',
      loading: '기록 불러오는 중',
      loadFailed: '불러오기 실패',
      emptyTitle: '아직 기록이 없습니다',
      emptyDescription: '업로드하고 분석한 메뉴가 여기에 표시됩니다.',
      upload: '메뉴 업로드',
      unnamed: '이름 없는 메뉴',
      dishCount: (count: number) => `${count}개 메뉴`,
      opening: '여는 중',
      view: '보기',
    },
    examples: {
      title: '샘플 메뉴 보기',
      description: '샘플 메뉴입니다. 직접 분석하려면 홈에서 메뉴를 업로드하세요.',
      loading: '샘플 메뉴 불러오는 중',
      empty: '샘플 메뉴가 없습니다. 먼저 seed 스크립트를 실행하세요.',
      loadFailed: '샘플 메뉴를 불러오지 못했습니다',
      fallback: '샘플 메뉴',
      opening: '여는 중',
      dishCount: (count: number) => `${count}개 메뉴`,
    },
    apiKey: {
      invalid: (provider: string) => `올바른 ${provider} API key를 입력하세요.`,
      title: '이번 달 무료 한도를 모두 사용했습니다',
      description: (provider: string) =>
        `계속 분석하려면 본인의 ${provider} key를 입력하세요.`,
      invalidTitle: 'API key가 유효하지 않습니다',
      invalidDescription: (provider: string) =>
        `이 브라우저에 저장된 ${provider} key가 거부되었습니다. 새 key를 붙여 넣거나 창을 닫고 서버 한도를 사용하세요.`,
      label: (provider: string) => `${provider} key`,
      later: '나중에',
      saveAndRetry: '저장 후 재시도',
    },
    warning: {
      allergen: (evidence: string, allergen: string) =>
        `${evidence} 포함 가능 (선택한 알레르기: ${allergen})`,
      dietary: (reason: string, evidence: string) =>
        `${reason} (근거: ${evidence})`,
      separator: ', ',
    },
    common: {
      close: '닫기',
    },
  },
} as const;

interface LanguageContextValue {
  language: TargetLanguage;
  setLanguage: (language: TargetLanguage) => void;
  copy: (typeof COPY)[TargetLanguage];
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function readInitialLanguage(): TargetLanguage {
  const stored = localStorage.getItem(STORAGE_KEY);
  return TARGET_LANGUAGE_KEYS.includes(stored as TargetLanguage)
    ? (stored as TargetLanguage)
    : 'zh';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<TargetLanguage>(readInitialLanguage);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = LOCALES[language];
  }, [language]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage: setLanguageState,
      copy: COPY[language],
    }),
    [language],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) {
    throw new Error('useLanguage must be used inside LanguageProvider.');
  }
  return value;
}

export { TARGET_LANGUAGE_KEYS, TARGET_LANGUAGE_LABELS };
