const DEFAULT_CONFIG = {
  pollMinutes: 3,
  groupName: "Bitbucket Review"
};

let userUuidCache: string | null = null;

async function getStoredConfig() {
  const stored = await chrome.storage.sync.get(["username", "appPassword", "pollMinutes"]);
  return { ...DEFAULT_CONFIG, ...stored };
}

type BitbucketUser = {
  uuid: string;
};

type BitbucketParticipant = {
  user: BitbucketUser;
  approved?: boolean;
  role?: string;
};

type BitbucketPR = {
  links: {
    html: {
      href: string;
    };
  };
  state?: string;
  reviewers?: BitbucketUser[];
  participants?: BitbucketParticipant[];
};

chrome.runtime.onInstalled.addListener(async () => {
  const config = await getStoredConfig();
  chrome.alarms.create("pollPRs", {
    periodInMinutes: config.pollMinutes
  });

  pollPRs();
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "CONFIG_UPDATED") {
    pollPRs();
  }
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "pollPRs") {
    pollPRs();
  }
});

async function pollPRs(): Promise<void> {
  const config = await getStoredConfig();
  if (!("username" in config) || !("appPassword" in config) || !config.username || !config.appPassword) {
    console.warn("Missing Bitbucket credentials. Please configure them in the extension options.");
    return;
  }

  try {
    const prs = await fetchPRs(config as { username: string; appPassword: string });
    const prUrls = prs.map(pr => pr.links.html.href);

    await syncTabs(prUrls, config.groupName);
  } catch (err) {
    console.error("Polling error:", err);
  }
}

async function getMyUuid(config: { username: string; appPassword: string }): Promise<string> {
  if (userUuidCache) return userUuidCache;

  const response = await fetch("https://api.bitbucket.org/2.0/user", {
    headers: {
      Authorization: `Basic ${btoa(`${config.username}:${config.appPassword}`)}`
    }
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`Auth check failed: ${response.status} ${response.statusText}`, text);
    throw new Error(`Auth check failed: ${response.status}`);
  }

  const data = await response.json();
  userUuidCache = data.uuid;
  return data.uuid;
}

type BitbucketRepo = {
  full_name: string;
};

async function fetchAllPages<T>(initialUrl: string, config: { username: string; appPassword: string }): Promise<T[]> {
  let url: string | null = initialUrl;
  const allValues: T[] = [];

  while (url) {
    const response = await fetch(url, {
      headers: {
        Authorization: `Basic ${btoa(`${config.username}:${config.appPassword}`)}`
      }
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`Bitbucket API error: ${response.status} ${response.statusText}`, text);
      throw new Error(`Bitbucket API error: ${response.status}`);
    }

    const data = await response.json();
    const values = (data.values ?? []) as T[];
    allValues.push(...values);
    url = data.next ?? null;
  }

  return allValues;
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  let index = 0;

  const run = async (): Promise<void> => {
    while (index < items.length) {
      const currentIndex = index;
      index += 1;
      results[currentIndex] = await worker(items[currentIndex]);
    }
  };

  const runners = Array.from({ length: Math.min(limit, items.length) }, () => run());
  await Promise.all(runners);
  return results;
}

async function fetchPRs(config: { username: string; appPassword: string }): Promise<BitbucketPR[]> {
  const myUuid = await getMyUuid(config);

  const repoUrl = new URL("https://api.bitbucket.org/2.0/repositories");
  repoUrl.searchParams.append("role", "member");
  repoUrl.searchParams.append("pagelen", "100");

  const repos = await fetchAllPages<BitbucketRepo>(repoUrl.toString(), config);
  const results = await mapWithConcurrency(repos, 6, async (repo) => {
    const prUrl = new URL(`https://api.bitbucket.org/2.0/repositories/${repo.full_name}/pullrequests`);
    prUrl.searchParams.append("state", "OPEN");
    prUrl.searchParams.append("pagelen", "50");
    prUrl.searchParams.append("q", `reviewers.uuid="${myUuid}"`);
    prUrl.searchParams.append("fields", "values.links.html.href,values.state,values.reviewers,values.participants");

    const response = await fetch(prUrl.toString(), {
      headers: {
        Authorization: `Basic ${btoa(`${config.username}:${config.appPassword}`)}`
      }
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`Bitbucket API error: ${response.status} ${response.statusText}`, text);
      return [] as BitbucketPR[];
    }

    const data = await response.json();
    return (data.values ?? []) as BitbucketPR[];
  });

  const allPrs = results.flat();

  return allPrs.filter(pr => {
    const reviewers = pr.reviewers ?? [];
    const participants = pr.participants ?? [];
    const isReviewer =
      reviewers.some(r => r.uuid === myUuid) ||
      participants.some(p => p.user.uuid === myUuid && p.role === "REVIEWER");
    const hasApproved = participants.some(p => p.user.uuid === myUuid && p.approved === true);
    const isOpen = pr.state ? pr.state === "OPEN" : true;

    return isOpen && isReviewer && !hasApproved;
  });
}

async function syncTabs(prUrls: string[], groupName: string): Promise<void> {
  const allGroups = await chrome.tabGroups.query({});
  const targetGroup = allGroups.find(g => g.title && g.title.startsWith(groupName));
  let groupId = targetGroup?.id;

  const normalizeUrl = (url: string) => {
    try {
      const parsed = new URL(url);
      const normalizedPath = parsed.pathname.replace(/\/+$/, "");
      return `${parsed.origin}${normalizedPath}`;
    } catch {
      return url;
    }
  };

  const urlMap = new Map<string, string>();
  for (const url of prUrls) {
    const key = normalizeUrl(url);
    if (!urlMap.has(key)) {
      urlMap.set(key, url);
    }
  }

  let groupTabs: chrome.tabs.Tab[] = [];
  if (groupId !== undefined) {
    groupTabs = await chrome.tabs.query({ groupId });
  }

  const prTabRegex = /\/pull-requests\/\d+\/?$/;
  const desiredPrUrls = new Set(urlMap.keys());

  const existingPrTabs = groupTabs.filter(t => t.url && prTabRegex.test(t.url));
  const existingPrUrls = new Set(existingPrTabs.map(t => normalizeUrl(t.url!)));

  const tabsToClose = existingPrTabs.filter(t => !desiredPrUrls.has(normalizeUrl(t.url!)));
  if (tabsToClose.length > 0) {
    const closeIds = tabsToClose.map(t => t.id!).filter(id => id !== undefined);
    if (closeIds.length > 0) {
      await chrome.tabs.remove(closeIds);
    }
  }

  const urlsToOpen = Array.from(urlMap.entries())
    .filter(([key]) => !existingPrUrls.has(key))
    .map(([, url]) => url);

  const newTabIds: number[] = [];
  for (const url of urlsToOpen) {
    const newTab = await chrome.tabs.create({ url, active: false });
    if (newTab.id) newTabIds.push(newTab.id);
  }

  if (newTabIds.length > 0) {
    if (groupId === undefined) {
      groupId = await chrome.tabs.group({ tabIds: newTabIds as [number, ...number[]] });
    } else {
      await chrome.tabs.group({ tabIds: newTabIds as [number, ...number[]], groupId });
    }
  }

  if (groupId !== undefined) {
    const finalTabs = await chrome.tabs.query({ groupId });
    const count = finalTabs.length;
    await chrome.tabGroups.update(groupId, { title: `${groupName} (${count})`, color: "blue" });
  }
}
