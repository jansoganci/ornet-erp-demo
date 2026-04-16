import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

// Import all translation files
import commonTr from '../locales/tr/common.json'
import authTr from '../locales/tr/auth.json'
import errorsTr from '../locales/tr/errors.json'
import customersTr from '../locales/tr/customers.json'
import workOrdersTr from '../locales/tr/workOrders.json'
import dailyWorkTr from '../locales/tr/dailyWork.json'
import workHistoryTr from '../locales/tr/workHistory.json'
import materialsTr from '../locales/tr/materials.json'
import tasksTr from '../locales/tr/tasks.json'
import dashboardTr from '../locales/tr/dashboard.json'
import profileTr from '../locales/tr/profile.json'
import calendarTr from '../locales/tr/calendar.json'
import subscriptionsTr from '../locales/tr/subscriptions.json'
import simCardsTr from '../locales/tr/simCards.json'
import proposalsTr from '../locales/tr/proposals.json'
import financeTr from '../locales/tr/finance.json'
import notificationsTr from '../locales/tr/notifications.json'
import recurringTr from '../locales/tr/recurring.json'
import siteAssetsTr from '../locales/tr/siteAssets.json'
import invoiceAnalysisTr from '../locales/tr/invoiceAnalysis.json'
import actionBoardTr from '../locales/tr/actionBoard.json'
import collectionTr from '../locales/tr/collection.json'
import operationsTr from '../locales/tr/operations.json'
import technicalGuideTr from '../locales/tr/technicalGuide.json'

import commonEn from '../locales/en/common.json'
import authEn from '../locales/en/auth.json'
import errorsEn from '../locales/en/errors.json'
import customersEn from '../locales/en/customers.json'
import workOrdersEn from '../locales/en/workOrders.json'
import dailyWorkEn from '../locales/en/dailyWork.json'
import workHistoryEn from '../locales/en/workHistory.json'
import materialsEn from '../locales/en/materials.json'
import tasksEn from '../locales/en/tasks.json'
import dashboardEn from '../locales/en/dashboard.json'
import profileEn from '../locales/en/profile.json'
import calendarEn from '../locales/en/calendar.json'
import subscriptionsEn from '../locales/en/subscriptions.json'
import simCardsEn from '../locales/en/simCards.json'
import proposalsEn from '../locales/en/proposals.json'
import financeEn from '../locales/en/finance.json'
import notificationsEn from '../locales/en/notifications.json'
import recurringEn from '../locales/en/recurring.json'
import siteAssetsEn from '../locales/en/siteAssets.json'
import invoiceAnalysisEn from '../locales/en/invoiceAnalysis.json'
import actionBoardEn from '../locales/en/actionBoard.json'
import collectionEn from '../locales/en/collection.json'
import operationsEn from '../locales/en/operations.json'
import technicalGuideEn from '../locales/en/technicalGuide.json'

i18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  defaultNS: 'common',
  ns: [
    'common',
    'auth',
    'errors',
    'customers',
    'workOrders',
    'dailyWork',
    'workHistory',
    'materials',
    'tasks',
    'dashboard',
    'profile',
    'calendar',
    'subscriptions',
    'simCards',
    'proposals',
    'finance',
    'notifications',
    'recurring',
    'siteAssets',
    'invoiceAnalysis',
    'actionBoard',
    'collection',
    'operations',
    'technicalGuide',
  ],
  resources: {
    tr: {
      common: commonTr,
      auth: authTr,
      errors: errorsTr,
      customers: customersTr,
      workOrders: workOrdersTr,
      dailyWork: dailyWorkTr,
      workHistory: workHistoryTr,
      materials: materialsTr,
      tasks: tasksTr,
      dashboard: dashboardTr,
      profile: profileTr,
      calendar: calendarTr,
      subscriptions: subscriptionsTr,
      simCards: simCardsTr,
      proposals: proposalsTr,
      finance: financeTr,
      notifications: notificationsTr,
      recurring: recurringTr,
      siteAssets: siteAssetsTr,
      invoiceAnalysis: invoiceAnalysisTr,
      actionBoard: actionBoardTr,
      collection: collectionTr,
      operations: operationsTr,
      technicalGuide: technicalGuideTr,
    },
    en: {
      common: commonEn,
      auth: authEn,
      errors: errorsEn,
      customers: customersEn,
      workOrders: workOrdersEn,
      dailyWork: dailyWorkEn,
      workHistory: workHistoryEn,
      materials: materialsEn,
      tasks: tasksEn,
      dashboard: dashboardEn,
      profile: profileEn,
      calendar: calendarEn,
      subscriptions: subscriptionsEn,
      simCards: simCardsEn,
      proposals: proposalsEn,
      finance: financeEn,
      notifications: notificationsEn,
      recurring: recurringEn,
      siteAssets: siteAssetsEn,
      invoiceAnalysis: invoiceAnalysisEn,
      actionBoard: actionBoardEn,
      collection: collectionEn,
      operations: operationsEn,
      technicalGuide: technicalGuideEn,
    },
  },
  interpolation: {
    escapeValue: false,
  },
})

export default i18n
