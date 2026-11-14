import React from 'react';

export function Table({
  className = '',
  children,
  ...props
}: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-[#E5EAF0] bg-white shadow-xs">
      <table className={`w-full text-left text-xs text-[#253746] ${className}`} {...props}>
        {children}
      </table>
    </div>
  );
}

export function TableHead({
  className = '',
  children,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={`border-b border-[#E5EAF0] bg-[#F5F7FA] text-[11px] font-bold uppercase tracking-wider text-[#718096] ${className}`}
      {...props}
    >
      {children}
    </thead>
  );
}

export function TableBody({
  className = '',
  children,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={`divide-y divide-[#E5EAF0] ${className}`} {...props}>
      {children}
    </tbody>
  );
}

export function TableRow({
  className = '',
  children,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={`transition hover:bg-[#F5F7FA]/80 ${className}`}
      {...props}
    >
      {children}
    </tr>
  );
}

export function TableCell({
  className = '',
  children,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={`px-4 py-3.5 align-middle ${className}`} {...props}>
      {children}
    </td>
  );
}

export function TableHeaderCell({
  className = '',
  children,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th className={`px-4 py-3 font-bold ${className}`} {...props}>
      {children}
    </th>
  );
}
