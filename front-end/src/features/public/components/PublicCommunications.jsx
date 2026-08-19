import { useEffect, useMemo, useState } from 'react';
import { API_URL } from '../../../services/httpClient.js';
import { localizeContent, usePublicLanguage } from '../i18n.js';
import '../../../styles/celebration-banner.css';

const STORAGE_KEY = 'spg_public_notifications_v1';
const COPY = {
  vi: { more:'Xem thêm', notice:'Thông báo', all:'Đã xem tất cả', close:'Đóng thông báo', unread:'Đánh dấu chưa xem', read:'Đánh dấu đã xem', hide:'Ẩn', empty:'Hiện chưa có thông báo mới.' },
  en: { more:'Learn more', notice:'Notifications', all:'Mark all as read', close:'Close notifications', unread:'Mark unread', read:'Mark as read', hide:'Hide', empty:'No new notifications.' },
  'zh-tw': { more:'查看更多', notice:'通知', all:'全部標為已讀', close:'關閉通知', unread:'標為未讀', read:'標為已讀', hide:'隱藏', empty:'目前沒有新通知。' },
};
const getId=(item)=>String(item?._id?.$oid||item?._id||item?.id||'');
function readLocalState(){try{const p=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');return{read:Array.isArray(p.read)?p.read:[],dismissed:Array.isArray(p.dismissed)?p.dismissed:[]};}catch{return{read:[],dismissed:[]};}}

export default function PublicCommunications(){
  const language=usePublicLanguage(); const c=COPY[language]||COPY.vi;
  const [banner,setBanner]=useState(null); const [notifications,setNotifications]=useState([]); const [localState,setLocalState]=useState(readLocalState); const [open,setOpen]=useState(false);
  async function refresh(){try{const response=await fetch(`${API_URL}/communications`);if(!response.ok)return;const payload=await response.json();setBanner(payload?.data?.banner||null);setNotifications(payload?.data?.notifications||[]);}catch{}}
  useEffect(()=>{refresh();const source=new EventSource(`${API_URL}/events`);source.addEventListener('communications',refresh);return()=>source.close();},[]);
  useEffect(()=>{localStorage.setItem(STORAGE_KEY,JSON.stringify(localState));},[localState]);
  const visibleNotifications=useMemo(()=>notifications.filter((item)=>item.published!==false).filter((item)=>!localState.dismissed.includes(getId(item))).slice(0,20),[localState.dismissed,notifications]);
  const unreadCount=useMemo(()=>visibleNotifications.filter((item)=>!localState.read.includes(getId(item))).length,[localState.read,visibleNotifications]);
  function markRead(id,read=true){setLocalState((current)=>({...current,read:read?[...new Set([...current.read,id])]:current.read.filter((item)=>item!==id)}));}
  function dismiss(id){setLocalState((current)=>({read:[...new Set([...current.read,id])],dismissed:[...new Set([...current.dismissed,id])]}));}
  function markAllRead(){setLocalState((current)=>({...current,read:[...new Set([...current.read,...visibleNotifications.map(getId)])]}));}
  const localizedBanner=localizeContent(banner,language);
  const bannerStyle=localizedBanner?.backgroundImageUrl?{'--event-background':`url("${String(localizedBanner.backgroundImageUrl).replace(/["\\]/g,'')}")`}:undefined;
  return <>
    {localizedBanner?.enabled&&(localizedBanner.title||localizedBanner.message)&&<div className={`public-event-banner public-event-banner--${localizedBanner.style||'event'}`} style={bannerStyle}>{localizedBanner.style==='celebration'&&<div className="public-celebration-confetti" aria-hidden="true">{Array.from({length:14},(_,index)=><i key={index} style={{'--piece':index}}/>)}</div>}<div className="public-container public-event-banner__inner"><span className="public-event-banner__pulse" aria-hidden="true"/><div className="public-event-banner__marquee"><div><strong>{localizedBanner.title}</strong>{localizedBanner.message&&<span>{localizedBanner.message}</span>}</div></div>{localizedBanner.link&&<a href={localizedBanner.link}>{c.more} <span aria-hidden="true">→</span></a>}</div></div>}
    <div className="public-notification-dock"><button className={`public-notification-button${open?' is-open':''}`} type="button" aria-label={c.notice} aria-expanded={open} onClick={()=>setOpen((v)=>!v)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>{unreadCount>0&&<span>{Math.min(unreadCount,9)}</span>}</button><div className={`public-notification-panel${open?' is-open':''}`}><div className="public-notification-panel__heading"><div><small>SPG Updates</small><strong>{c.notice}</strong></div><div className="public-notification-panel__heading-actions">{unreadCount>0&&<button type="button" onClick={markAllRead}>{c.all}</button>}<button type="button" aria-label={c.close} onClick={()=>setOpen(false)}>×</button></div></div><div className="public-notification-panel__list">{visibleNotifications.map((raw)=>{const item=localizeContent(raw,language);const id=getId(raw);const read=localState.read.includes(id);return <article className={read?'is-read':'is-unread'} key={id}><span className={`public-notification-dot is-${item.type||'info'}`}/><div className="public-notification-copy">{item.link?<a href={item.link} onClick={()=>markRead(id,true)}><strong>{item.title}</strong><p>{item.message}</p></a>:<><strong>{item.title}</strong><p>{item.message}</p></>}<div className="public-notification-actions"><button type="button" onClick={()=>markRead(id,!read)}>{read?c.unread:c.read}</button><button type="button" onClick={()=>dismiss(id)}>{c.hide}</button></div></div></article>;})}{!visibleNotifications.length&&<p className="public-notification-panel__empty">{c.empty}</p>}</div></div></div>
  </>;
}
