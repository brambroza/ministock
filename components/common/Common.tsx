"use client";
import { Alert, Box, Card, CardContent, CircularProgress, Stack, Typography } from "@mui/material";

export const PageHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => <Box mb={2}><Typography variant="h5" fontWeight={700}>{title}</Typography>{subtitle ? <Typography color="text.secondary">{subtitle}</Typography> : null}</Box>;
export const StatCard = ({ title, value }: { title: string; value: string | number }) => <Card><CardContent><Typography color="text.secondary">{title}</Typography><Typography variant="h4">{value}</Typography></CardContent></Card>;
export const EmptyState = ({ text }: { text: string }) => <Alert severity="info">{text}</Alert>;
export const LoadingScreen = () => <Stack alignItems="center" justifyContent="center" minHeight={200}><CircularProgress /></Stack>;
