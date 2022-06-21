use std::ops::Deref;
use {
    anchor_lang::{
        prelude::{AnchorDeserialize, *},
        solana_program::system_program,
    },
    anchor_spl::token::{Mint, Token, TokenAccount},
};

declare_id!("3jNRmXFcRMhgubd5mec267q8AwxSMhxLHumzrp1QNnpT");

#[program]
pub mod token_faucet {
    use super::*;

    pub fn initialize_token_faucet(
        ctx: Context<InitializeTokenFaucet>,
        id: String,
        decimals: u8,
        mint_amount: u64,
    ) -> Result<()> {
        let token_faucet = &mut ctx.accounts.token_faucet;
        token_faucet.minted_supply = 0;
        token_faucet.last_minted = 0;
        token_faucet.mint_amount = mint_amount;
        token_faucet.token_faucet_bump = *ctx.bumps.get("token_faucet").unwrap();
        token_faucet.token_mint_bump = *ctx.bumps.get("token_mint").unwrap();
        Ok(())
    }

    pub fn token_sip(ctx: Context<TokenSip>, id: String) -> Result<()> {
        let token_faucet = &mut ctx.accounts.token_faucet;
        // if ctx.accounts.clock.unix_timestamp > token_faucet.last_minted.checked_add(1).unwrap() {
        // }
        let base_key = ctx.accounts.creator.key();
        let id = id.as_bytes();
        let seeds = &[
            base_key.as_ref(),
            id.trim_ascii_whitespace(),
            &[token_faucet.token_faucet_bump],
        ];
        let signer = &[&seeds[..]];
        let cpi_accounts = anchor_spl::token::MintTo {
            mint: ctx.accounts.token_mint.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: token_faucet.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        anchor_spl::token::mint_to(cpi_ctx, token_faucet.mint_amount)?;
        token_faucet.minted_supply = token_faucet.minted_supply.checked_add(token_faucet.mint_amount).unwrap();
        Ok(())
    }

    //pub sip
}

#[derive(Accounts)]
#[instruction(id: String, decimals: u8)]
pub struct InitializeTokenFaucet<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    #[account(
        init,
        seeds = [creator.key().as_ref(), id.as_bytes()],
        bump,
        payer = creator,
        space = 72
    )]
    pub token_faucet: Box<Account<'info, TokenFaucet>>,
    #[account(
        init,
        mint::authority = token_faucet,
        mint::decimals = decimals,
        seeds = [token_faucet.key().as_ref(), b"faucet_mint".as_ref()],
        bump,
        payer = creator
    )]
    pub token_mint: Box<Account<'info, Mint>>,
    #[account(address = anchor_spl::token::ID)]
    pub token_program: Program<'info, Token>,
    #[account(address = system_program::ID)]
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

//Sip
#[derive(Accounts)]
#[instruction(id: String)]
pub struct TokenSip<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    /// CHECK: creator root
    #[account()]
    pub creator: AccountInfo<'info>,
    #[account(
        mut,
        seeds = [creator.key().as_ref(), id.as_bytes()],
        bump = token_faucet.token_faucet_bump
    )]
    pub token_faucet: Box<Account<'info, TokenFaucet>>,
    #[account(
        mut,
        seeds = [token_faucet.key().as_ref(), b"faucet_mint".as_ref()],
        bump = token_faucet.token_mint_bump
    )]
    pub token_mint: Box<Account<'info, Mint>>,
    #[account(
        mut,
        constraint = &user_token_account.mint == token_mint.to_account_info().key,
        constraint = &user_token_account.owner == user.to_account_info().key
    )]
    pub user_token_account: Box<Account<'info, TokenAccount>>,
    #[account(address = anchor_spl::token::ID)]
    pub token_program: Program<'info, Token>,
    #[account(address = system_program::ID)]
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
    pub clock: Sysvar<'info, Clock>,
}

#[account]
#[derive(Default)]
pub struct TokenFaucet {
    pub minted_supply: u64,
    pub last_minted: i64,
    pub mint_interval: u64,
    pub mint_amount: u64,
    //todo - before interval tax?
    pub token_faucet_bump: u8,
    pub token_mint_bump: u8,
}
pub trait TrimAsciiWhitespace {
    /// Trim ascii whitespace (based on `is_ascii_whitespace()`) from the
    /// start and end of a slice.
    fn trim_ascii_whitespace(&self) -> &[u8];
}

impl<T: Deref<Target = [u8]>> TrimAsciiWhitespace for T {
    fn trim_ascii_whitespace(&self) -> &[u8] {
        let from = match self.iter().position(|x| !x.is_ascii_whitespace()) {
            Some(i) => i,
            None => return &self[0..0],
        };
        let to = self.iter().rposition(|x| !x.is_ascii_whitespace()).unwrap();
        &self[from..=to]
    }
}
