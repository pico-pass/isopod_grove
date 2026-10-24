import { useCallback, useEffect, useState } from 'react';
import { api } from './api/client';
import { useAuth } from './auth/useAuth';
import { useGameEngine } from './hooks/useGameEngine';
import { LoginView } from './components/LoginView';
import { TopBar } from './components/TopBar';
import { Sidebar, type ViewKey } from './components/Sidebar';
import { resolveNavigationTarget, type NavigationTarget } from './utils/views';
import { HabitatView } from './components/HabitatView';
import { CollectionView } from './components/CollectionView';
import { MarketView } from './components/MarketView';
import { UpgradesView } from './components/UpgradesView';
import { AchievementsView } from './components/AchievementsView';
import { RankingView } from './components/RankingView';
import { BattleView } from './components/BattleView';
import { PvpView } from './components/PvpView';
import { BossView } from './components/BossView';
import { SurvivalView } from './components/SurvivalView';
import { PuzzleView } from './components/PuzzleView';
import { RunnerView } from './components/RunnerView';
import { StackView } from './components/StackView';
import { ShopSimView } from './components/ShopSimView';
import { QuizView } from './components/QuizView';
import { NewsView } from './components/NewsView';
import { BoostShopView } from './components/BoostShopView';
import { ExpeditionView } from './components/ExpeditionView';
import { EquipmentView } from './components/EquipmentView';
import { FriendsView } from './components/FriendsView';
import { MailView } from './components/MailView';
import { ProfileModal } from './components/ProfileModal';
import { AdminView } from './components/AdminView';
import { JournalView } from './components/JournalView';
import { ChangelogView } from './components/ChangelogView';
import { VisitView } from './components/VisitView';
import { DungeonView } from './components/DungeonView';
import { WantedView } from './components/WantedView';
import { UnderdogView } from './components/UnderdogView';
import { RestorationView } from './components/RestorationView';
import { SeasonalView } from './components/SeasonalView';
import { FortuneView } from './components/FortuneView';
import { AuctionView } from './components/AuctionView';
import { SkillLabView } from './components/SkillLabView';
import { AwakenView } from './components/AwakenView';
import { EngraveView } from './components/EngraveView';
import { ManagerView } from './components/ManagerView';
import { ExhibitView } from './components/ExhibitView';
import { MerchantView } from './components/MerchantView';
import { PromoPopup } from './components/PromoPopup';
import { ChatWidget } from './components/ChatWidget';
import { Toast } from './components/Toast';
import {
  applySpeciesNicknames,
  computeEquipmentBonuses,
  getAchievementProgress,
  getPopulationCount,
} from './utils/gameCalc';
import { releasePushOnLogout, syncPushSubscription } from './utils/push';
import { hasUnseenChangelog, loadSeenChangelogDate, saveSeenChangelogDate } from './utils/changelog';
import './App.css';

// 푸시 알림을 눌러 열었을 때 주소 조각(#friends, #mail, #visit-me)으로 처음 보여줄 화면을 정한다.
function initialNavigationFromHash(): NavigationTarget {
  const target = resolveNavigationTarget(window.location.hash.slice(1));
  if (target) {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    return target;
  }
  return { view: 'habitat', visitTarget: null };
}

function App() {
  const { user, loading: authLoading, logout, setUser } = useAuth();
  const {
    gameState,
    species,
    upgrades,
    quests,
    achievements,
    equipmentCatalog,
    decorCatalog,
    bossCatalog,
    levelLeaderboard,
    incomeLeaderboard,
    pvpLeaderboard,
    bossLeaderboard,
    survivalLeaderboard,
    friendsCount,
    likeCounts,
    refreshLikeCounts,
    weather,
    mailSummary,
    refreshMailSummary,
    friendChatUnread,
    refreshFriendChatUnread,
    notificationPrefs,
    updateNotificationPrefs,
    leaderboardLoading,
    leaderboardLimit,
    changeLeaderboardLimit,
    reloadLeaderboards,
    loading,
    error,
    toast,
    showToast,
    runAction,
  } = useGameEngine(user?._id ?? null);
  const [initialNav] = useState(initialNavigationFromHash);
  const [view, setView] = useState<ViewKey>(initialNav.view);
  const [selectedTerrariumId, setSelectedTerrariumId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileTarget, setProfileTarget] = useState<string | null>(null);
  // 사육장 방문 화면에서 구경 중인 유저(없으면 인기 사육장 목록)
  const [visitTarget, setVisitTarget] = useState<string | null>(initialNav.visitTarget);
  const openVisit = useCallback((userId: string | null) => {
    setVisitTarget(userId);
    if (userId) {
      setView('visit');
      setProfileTarget(null);
    }
  }, []);
  // 업데이트 내역 화면에서 마지막으로 확인한 최신 날짜(사이드바의 NEW 표시 기준, 이 브라우저에만 기억)
  const [changelogSeen, setChangelogSeen] = useState<string | null>(loadSeenChangelogDate);
  const markChangelogSeen = useCallback((latest: string) => {
    saveSeenChangelogDate(latest);
    setChangelogSeen(latest);
  }, []);

  // 이미 열려 있는 창에서 푸시 알림을 눌렀을 때 서비스 워커가 보내는 "이 화면으로 이동" 메시지를 받는다.
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const onMessage = (e: MessageEvent<{ type?: string; view?: string }>) => {
      const target = e.data?.type === 'navigate' ? resolveNavigationTarget(e.data.view) : null;
      if (!target) return;
      setView(target.view);
      if (target.view === 'visit') setVisitTarget(target.visitTarget);
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, []);

  // 로그인되면 이 브라우저의 푸시 구독을 지금 유저로 맞춘다(구독이 없으면 아무것도 하지 않는다).
  const userId = user?._id;
  useEffect(() => {
    if (userId) void syncPushSubscription();
  }, [userId]);

  // 로그아웃할 때 이 기기의 푸시 구독을 먼저 정리해서, 다음에 로그인하는 사람이 이전 사람의 알림을 받지 않게 한다.
  const handleLogout = async () => {
    await releasePushOnLogout();
    logout();
  };

  if (authLoading) {
    return (
      <div className="center-screen">
        <p>로그인 상태를 확인하고 있어요...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  if (error) {
    return (
      <div className="center-screen">
        <p>문제가 발생했어요: {error}</p>
        <p className="footnote">백엔드 서버(NestJS)와 MongoDB가 실행 중인지 확인해 주세요.</p>
      </div>
    );
  }

  if (loading || !gameState) {
    return (
      <div className="center-screen">
        <p>작은 숲을 준비하고 있어요...</p>
      </div>
    );
  }

  // 내가 지정한 종 별명을 이름에 반영한 목록. 나에게만 보이는 표시용이라 원본 species는 그대로 둔다.
  const displaySpecies = applySpeciesNicknames(species, gameState);
  // 지금 장착한 장비가 올려주는 스탯 보너스(전투 화면의 미리보기 스탯에 쓴다)
  const equipmentBonuses = computeEquipmentBonuses(
    gameState.equipmentSlots,
    gameState.equipment,
    equipmentCatalog,
  );
  const terrarium =
    gameState.terrariums.find((t) => t.terrariumId === selectedTerrariumId) ??
    gameState.terrariums[0];
  const totalPopulation = gameState.terrariums.reduce(
    (sum, t) => sum + getPopulationCount(t.population),
    0,
  );
  const claimableAchievements = achievements.filter((a) => {
    if (gameState.achievementsClaimed.includes(a.achievementId)) return false;
    const { progress, target } = getAchievementProgress(a, gameState, species, {
      friendsCount,
      equipmentCatalog,
      decorCatalog: decorCatalog?.items,
      likesReceived: likeCounts.received,
      likesGiven: likeCounts.given,
    });
    return target > 0 && progress >= target;
  }).length;

  return (
    <>
      <TopBar
        coins={gameState.coins}
        explorationTickets={gameState.explorationTickets}
        diamonds={gameState.diamonds}
        user={user}
        onLogout={() => void handleLogout()}
        onOpenProfile={() => setProfileTarget(user._id)}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
      />
      <div className="app-shell">
        <Sidebar
          view={view}
          onChange={(v) => {
            if (v === 'visit') setVisitTarget(null); // 사이드바로 들어오면 목록부터 보여준다
            setView(v);
          }}
          populationCount={totalPopulation}
          claimableAchievements={claimableAchievements}
          mailBadge={mailSummary.badge}
          friendChatBadge={friendChatUnread.total}
          changelogNew={hasUnseenChangelog(changelogSeen)}
          discoveredCount={gameState.discovered.length}
          speciesTotal={species.length}
          xp={gameState.xp}
          isAdmin={user.isAdmin ?? false}
          mobileOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <main>
          {view === 'habitat' && (
            <HabitatView
              gameState={gameState}
              species={displaySpecies}
              quests={quests}
              terrarium={terrarium}
              onSelectTerrarium={setSelectedTerrariumId}
              onAddTerrarium={async () => {
                const result = await runAction(() => api.addTerrarium());
                if (result?.terrariumId) setSelectedTerrariumId(result.terrariumId);
              }}
              onRenameTerrarium={(terrariumId, name) => runAction(() => api.renameTerrarium(terrariumId, name))}
              onMove={(speciesId, toTerrariumId) =>
                runAction(() => api.moveSpecies(speciesId, terrarium.terrariumId, toTerrariumId))
              }
              onCare={(action) => runAction(() => api.care(action, terrarium.terrariumId))}
              onObserve={(speciesId) => runAction(() => api.observe(speciesId))}
              onCollect={() => runAction(() => api.collect())}
              onExplore={(useTicket) => runAction(() => api.explore(terrarium.terrariumId, useTicket))}
              onClaim={(questId) => runAction(() => api.claim(questId))}
              decorCatalog={decorCatalog?.items ?? []}
              decorTierNames={decorCatalog?.tierNames ?? []}
              onBuyDecor={(decorId) => runAction(() => api.buyDecor(decorId))}
              onPlaceDecor={(terrariumId, kind, index, decorId) => runAction(() => api.placeDecor(terrariumId, kind, index, decorId))}
              onSetTerrariumPublic={(isPublic) => runAction(() => api.setTerrariumPublic(isPublic))}
              onOpenSeasonal={() => setView('seasonal')}
              onOpenFortune={() => setView('fortune')}
              onVisitMine={() => openVisit(user._id)}
              weather={weather}
            />
          )}
          {view === 'collection' && (
            <CollectionView
              gameState={gameState}
              species={displaySpecies}
              onSetNickname={(speciesId, nickname) =>
                runAction(() => api.setSpeciesNickname(speciesId, nickname))
              }
            />
          )}
          {view === 'market' && (
            <MarketView
              gameState={gameState}
              terrarium={terrarium}
              species={displaySpecies}
              onSell={(speciesId, quantity, confirmLast) =>
                runAction(() => api.sell(speciesId, quantity, terrarium.terrariumId, confirmLast))
              }
              onToggleLock={(speciesId, locked) => runAction(() => api.setSpeciesLock(speciesId, locked))}
              onExplore={(useTicket) => runAction(() => api.explore(terrarium.terrariumId, useTicket))}
            />
          )}
          {view === 'expedition' && (
            <ExpeditionView
              gameState={gameState}
              terrarium={terrarium}
              species={displaySpecies}
              onExpedition={(tier) => runAction(() => api.expedition(tier, terrarium.terrariumId))}
              weather={weather}
            />
          )}
          {view === 'upgrades' && (
            <UpgradesView
              gameState={gameState}
              terrarium={terrarium}
              upgrades={upgrades}
              onSelectTerrarium={setSelectedTerrariumId}
              onUpgrade={(upgradeId) => runAction(() => api.upgrade(upgradeId, terrarium.terrariumId))}
            />
          )}
          {view === 'shop' && (
            <BoostShopView gameState={gameState} onBuy={(kind, hours) => runAction(() => api.buyBoost(kind, hours))} />
          )}
          {view === 'achievements' && (
            <AchievementsView
              gameState={gameState}
              species={species}
              achievements={achievements}
              friendsCount={friendsCount}
              equipmentCatalog={equipmentCatalog}
              decorCatalog={decorCatalog?.items ?? []}
              likeCounts={likeCounts}
              onClaim={(achievementId) => runAction(() => api.claimAchievement(achievementId))}
            />
          )}
          {view === 'ranking' && (
            <RankingView
              levelLeaderboard={levelLeaderboard}
              incomeLeaderboard={incomeLeaderboard}
              pvpLeaderboard={pvpLeaderboard}
              bossLeaderboard={bossLeaderboard}
              survivalLeaderboard={survivalLeaderboard}
              loading={leaderboardLoading}
              limit={leaderboardLimit}
              onChangeLimit={changeLeaderboardLimit}
              onRefresh={reloadLeaderboards}
              onOpenProfile={setProfileTarget}
            />
          )}
          {view === 'battle' && (
            <BattleView
              gameState={gameState}
              species={displaySpecies}
              equipmentBonuses={equipmentBonuses}
              onBattle={(speciesId, difficulty) => runAction(() => api.battle(speciesId, difficulty))}
              onTrain={(speciesId, intensity, extreme) =>
                runAction(() => api.train(speciesId, intensity, extreme))
              }
              onDuelStart={(speciesId, difficulty) => runAction(() => api.battleDuelStart(speciesId, difficulty))}
              onDuelAct={(action, rhythm) => runAction(() => api.battleDuelAct(action, rhythm))}
              onDuelForfeit={() => runAction(() => api.battleDuelForfeit())}
            />
          )}
          {view === 'boss' && (
            <BossView
              gameState={gameState}
              species={displaySpecies}
              catalog={bossCatalog}
              equipmentCatalog={equipmentCatalog}
              equipmentBonuses={equipmentBonuses}
              onBattle={(speciesId, floor, difficulty) => runAction(() => api.bossBattle(speciesId, floor, difficulty))}
              onBuyAttempt={() => runAction(() => api.buyBossAttempt())}
              onSkipCooldown={() => runAction(() => api.skipBossCooldown())}
              onDuelStart={(speciesId, floor, difficulty) => runAction(() => api.bossDuelStart(speciesId, floor, difficulty))}
              onDuelAct={(action, rhythm) => runAction(() => api.bossDuelAct(action, rhythm))}
              onDuelForfeit={() => runAction(() => api.bossDuelForfeit())}
            />
          )}
          {view === 'underdog' && (
            <UnderdogView
              species={displaySpecies}
              onEnter={(speciesId) => runAction(() => api.underdogEnter(speciesId))}
              onMatch={(opponentUserId) => runAction(() => api.underdogMatch(opponentUserId))}
              onClaim={() => runAction(() => api.underdogClaim())}
            />
          )}
          {view === 'wanted' && (
            <WantedView
              species={displaySpecies}
              onStart={(speciesId, tier) => runAction(() => api.wantedStart(speciesId, tier))}
              onAct={(action, rhythm) => runAction(() => api.wantedAct(action, rhythm))}
              onForfeit={() => runAction(() => api.wantedForfeit())}
            />
          )}
          {view === 'dungeon' && (
            <DungeonView
              gameState={gameState}
              species={displaySpecies}
              equipmentBonuses={equipmentBonuses}
              onStart={(speciesId, difficulty, supplies, pay) => runAction(() => api.dungeonStart(speciesId, difficulty, supplies, pay))}
              onLabUpgrade={(id) => runAction(() => api.dungeonLabUpgrade(id))}
              onScout={() => runAction(() => api.dungeonScout())}
              onReroll={() => runAction(() => api.dungeonReroll())}
              onChoose={(choice) => runAction(() => api.dungeonChoose(choice))}
              onDuelAct={(action, rhythm) => runAction(() => api.dungeonDuelAct(action, rhythm))}
              onRetire={() => runAction(() => api.dungeonRetire())}
              onSetGuardian={(speciesId) => runAction(() => api.setDungeonGuardian(speciesId))}
              onClaimToll={() => runAction(() => api.claimDungeonToll())}
              onOpenProfile={setProfileTarget}
            />
          )}
          {view === 'survival' && (
            <SurvivalView
              gameState={gameState}
              species={displaySpecies}
              equipmentBonuses={equipmentBonuses}
              onStart={(speciesId, mode) => runAction(() => api.survivalStart(speciesId, mode))}
              onDuelAct={(action, rhythm) => runAction(() => api.survivalDuelAct(action, rhythm))}
              onChoose={(buffId) => runAction(() => api.survivalChoose(buffId))}
              onRetire={() => runAction(() => api.survivalRetire())}
              onRevive={() => runAction(() => api.survivalRevive())}
              onBuyAttempt={() => runAction(() => api.buySurvivalAttempt())}
              showToast={showToast}
            />
          )}
          {view === 'merchant' && <MerchantView paused={gameState.paused} onBuy={(itemId, count) => runAction(() => api.merchantBuy(itemId, count))} />}
          {view === 'exhibit' && (
            <ExhibitView
              species={displaySpecies}
              paused={gameState.paused}
              onCraft={(speciesId) => runAction(() => api.exhibitCraft(speciesId))}
              onDisplay={(speciesId, show) => runAction(() => api.exhibitDisplay(speciesId, show))}
              onShelf={() => runAction(() => api.exhibitShelf())}
              onOpenProfile={setProfileTarget}
            />
          )}
          {view === 'manager' && <ManagerView paused={gameState.paused} onHire={(grade) => runAction(() => api.managerHire(grade))} onDismiss={() => runAction(() => api.managerDismiss())} />}
          {view === 'engrave' && (
            <EngraveView
              coins={gameState.coins}
              paused={gameState.paused}
              onRoll={(itemId) => runAction(() => api.engraveRoll(itemId))}
              onAccept={(itemId) => runAction(() => api.engraveAccept(itemId))}
              onDiscard={(itemId) => runAction(() => api.engraveDiscard(itemId))}
            />
          )}
          {view === 'awaken' && <AwakenView species={displaySpecies} paused={gameState.paused} onAwaken={(speciesId) => runAction(() => api.awaken(speciesId))} />}
          {view === 'skilllab' && <SkillLabView coins={gameState.coins} diamonds={gameState.diamonds} paused={gameState.paused} onUpgrade={(id) => runAction(() => api.skillLabUpgrade(id))} />}
          {view === 'auction' && (
            <AuctionView coins={gameState.coins} paused={gameState.paused} onBid={(lot, amount) => runAction(() => api.auctionBid(lot, amount))} onClaim={() => runAction(() => api.auctionClaim())} />
          )}
          {view === 'fortune' && <FortuneView paused={gameState.paused} onDraw={() => runAction(() => api.fortuneDraw())} />}
          {view === 'seasonal' && (
            <SeasonalView coins={gameState.coins} paused={gameState.paused} onGift={(eventId) => runAction(() => api.seasonalGift(eventId))} onBuyDecor={(decorId) => runAction(() => api.buyDecor(decorId))} />
          )}
          {view === 'restoration' && <RestorationView onClaim={(id, last) => runAction(() => api.restorationClaim(id, last))} />}
          {view === 'news' && <NewsView />}
          {view === 'quiz' && (
            <QuizView
              onStart={() => api.quizStart().catch((e: unknown) => {
                showToast(e instanceof Error ? e.message : '퀴즈를 시작하지 못했어요.', true);
                return null;
              })}
              onAnswer={(speciesId) => runAction(() => api.quizAnswer(speciesId))}
              showToast={showToast}
              onOpenProfile={setProfileTarget}
            />
          )}
          {view === 'shopsim' && <ShopSimView onRun={(plan, practice) => runAction(() => api.shopSimRun(plan, practice))} />}
          {view === 'stack' && (
            <StackView
              gameState={gameState}
              species={displaySpecies}
              onStart={(speciesId) => api.stackStart(speciesId).catch((e: unknown) => {
                showToast(e instanceof Error ? e.message : '쌓기를 시작하지 못했어요.', true);
                return null;
              })}
              onFinish={(delays) => runAction(() => api.stackFinish(delays))}
              showToast={showToast}
              onOpenProfile={setProfileTarget}
            />
          )}
          {view === 'runner' && (
            <RunnerView
              gameState={gameState}
              species={displaySpecies}
              onStart={(speciesId) => api.runnerStart(speciesId).catch((e: unknown) => {
                showToast(e instanceof Error ? e.message : '달리기를 시작하지 못했어요.', true);
                return null;
              })}
              onFinish={(jumps) => runAction(() => api.runnerFinish(jumps))}
              showToast={showToast}
              onOpenProfile={setProfileTarget}
            />
          )}
          {view === 'puzzle' && (
            <PuzzleView
              onSubmit={(dayKey, stage, moves) => runAction(() => api.puzzleSubmit(dayKey, stage, moves))}
              onClaimRank={() => runAction(() => api.puzzleClaimRank())}
              showToast={showToast}
              onOpenProfile={setProfileTarget}
            />
          )}
          {view === 'pvp' && (
            <PvpView
              gameState={gameState}
              species={displaySpecies}
              equipmentBonuses={equipmentBonuses}
              onSetDefense={(speciesId) => runAction(() => api.setPvpDefense(speciesId))}
              onFindOpponent={async () => {
                try {
                  return await api.getPvpOpponent();
                } catch (e) {
                  showToast(e instanceof Error ? e.message : '상대를 찾지 못했어요.', true);
                  return null;
                }
              }}
              onPvpBattle={(speciesId, opponentUserId) =>
                runAction(() => api.pvpBattle(speciesId, opponentUserId))
              }
            />
          )}
          {view === 'equipment' && (
            <EquipmentView
              gameState={gameState}
              catalog={equipmentCatalog}
              showToast={showToast}
              onPull={(count) => runAction(() => api.pullEquipment(count))}
              onLevelUp={(itemId) => runAction(() => api.levelUpEquipment(itemId))}
              onAwaken={(itemId) => runAction(() => api.awakenEquipment(itemId))}
              onEquip={(slotIndex, itemId) => runAction(() => api.equipEquipment(slotIndex, itemId))}
              onExpandSlot={() => runAction(() => api.expandEquipmentSlots())}
              onDismantle={(itemId, count) => runAction(() => api.dismantleEquipment(itemId, count))}
              onLevelUpShards={(itemId) => runAction(() => api.levelUpEquipmentWithShards(itemId))}
            />
          )}
          {view === 'mail' && (
            <MailView
              onClaim={(mailId) => runAction(() => api.claimMail(mailId))}
              onClaimAll={() => runAction(() => api.claimAllMail())}
              onChanged={refreshMailSummary}
              showToast={showToast}
            />
          )}
          {view === 'friends' && (
            <FriendsView
              currentUserId={user._id}
              unreadByFriend={friendChatUnread.byFriend}
              onUnreadChanged={refreshFriendChatUnread}
              showToast={showToast}
              onOpenProfile={setProfileTarget}
            />
          )}
          {view === 'visit' && (
            <VisitView
              targetUserId={visitTarget}
              species={species}
              decorCatalog={decorCatalog?.items ?? []}
              onVisit={openVisit}
              onOpenProfile={setProfileTarget}
              onLikeChanged={refreshLikeCounts}
              showToast={showToast}
            />
          )}
          {view === 'journal' && <JournalView gameState={gameState} />}
          {view === 'changelog' && <ChangelogView seenDate={changelogSeen} onSeen={markChangelogSeen} />}
          {view === 'admin' && user.isAdmin && <AdminView />}
        </main>
      </div>
      <ChatWidget currentUserId={user._id} onOpenProfile={setProfileTarget} />
      <PromoPopup userId={user._id} species={species} />
      {profileTarget && (
        <ProfileModal
          targetUserId={profileTarget}
          currentUser={user}
          gameState={gameState}
          species={species}
          achievementsTotal={achievements.length}
          diamonds={gameState.diamonds}
          onClose={() => setProfileTarget(null)}
          onSetNickname={(nickname) =>
            runAction(() => api.setNickname(nickname)).then((result) => {
              if (result?.user) setUser(result.user);
            })
          }
          notificationPrefs={notificationPrefs}
          onUpdateNotificationPrefs={(patch) => void updateNotificationPrefs(patch)}
          onSetProfileMessage={(message) =>
            api
              .setProfileMessage(message)
              .then((updated) => setUser(updated))
              .catch((e) => showToast(e instanceof Error ? e.message : '메시지 변경에 실패했어요.', true))
          }
          onVisit={openVisit}
          showToast={showToast}
        />
      )}
      <Toast toast={toast} />
    </>
  );
}

export default App;
