import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replit_integrations/auth";
import { newsFiltersSchema } from "@shared/schema";
import { z } from "zod";
import { syncFplAvailability, classifyPlayer } from "./fpl-sync";

const shareClickSchema = z.object({
  articleId: z.string(),
  platform: z.enum(["whatsapp", "twitter", "facebook", "copy", "native"]),
});

export async function registerRoutes(httpServer: Server, app: Express): Promise<void> {
  // Auth routes
  await setupAuth(app);

  // ========== TEAMS ==========
  app.get("/api/teams", async (req, res) => {
    try {
      const teams = await storage.getTeams();
      res.json(teams);
    } catch (error) {
      console.error("Error fetching teams:", error);
      res.status(500).json({ error: "Failed to fetch teams" });
    }
  });

  app.get("/api/teams/:slug", async (req, res) => {
    try {
      const team = await storage.getTeamBySlug(req.params.slug);
      if (!team) {
        return res.status(404).json({ error: "Team not found" });
      }
      res.json(team);
    } catch (error) {
      console.error("Error fetching team:", error);
      res.status(500).json({ error: "Failed to fetch team" });
    }
  });

  // ========== PLAYERS ==========
  app.get("/api/players/team/:slug", async (req, res) => {
    try {
      const team = await storage.getTeamBySlug(req.params.slug);
      if (!team) {
        return res.json([]);
      }
      const players = await storage.getPlayersByTeam(team.id);
      res.json(players);
    } catch (error) {
      console.error("Error fetching players:", error);
      res.status(500).json({ error: "Failed to fetch players" });
    }
  });

  // ========== NEWS (with URL-driven filters) ==========
  app.get("/api/news", async (req: any, res) => {
    try {
      const parsed = newsFiltersSchema.safeParse(req.query);
      
      if (!parsed.success) {
        return res.status(400).json({ 
          error: "Invalid filter parameters",
          details: parsed.error.errors 
        });
      }
      
      const { comp, type, teams: teamsParam, sort, range, breaking } = parsed.data;
      
      if (sort === "for-you" && !req.user) {
        return res.status(401).json({ error: "Authentication required for 'For You' sort" });
      }
      
      let teamSlugs: string[] = [];
      let myTeams = false;
      
      if (teamsParam === "my") {
        if (!req.user) {
          return res.status(401).json({ error: "Authentication required for 'My Teams' filter" });
        }
        const followedTeamIds = await storage.getFollowsByUser(req.user.id);
        const allTeams = await storage.getTeams();
        teamSlugs = allTeams
          .filter(t => followedTeamIds.includes(t.id))
          .map(t => t.slug);
        myTeams = true;
      } else if (teamsParam) {
        teamSlugs = teamsParam.split(",").filter(Boolean);
      }
      
      const result = await storage.getNewsArticles({
        comp,
        type,
        teamSlugs,
        sort,
        range,
        breaking,
      });
      
      result.appliedFilters.myTeams = myTeams;
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching news:", error);
      res.status(500).json({ error: "Failed to fetch news" });
    }
  });

  // ========== ARTICLES ==========
  app.get("/api/articles", async (req, res) => {
    try {
      const category = req.query.category as string | undefined;
      const articles = await storage.getArticles(category);
      res.json(articles);
    } catch (error) {
      console.error("Error fetching articles:", error);
      res.status(500).json({ error: "Failed to fetch articles" });
    }
  });

  app.get("/api/articles/category/:category", async (req, res) => {
    try {
      const articles = await storage.getArticles(req.params.category);
      res.json(articles);
    } catch (error) {
      console.error("Error fetching articles:", error);
      res.status(500).json({ error: "Failed to fetch articles" });
    }
  });

  app.get("/api/articles/team/:slug", async (req, res) => {
    try {
      const articles = await storage.getArticlesByTeam(req.params.slug);
      res.json(articles);
    } catch (error) {
      console.error("Error fetching articles:", error);
      res.status(500).json({ error: "Failed to fetch articles" });
    }
  });

  app.get("/api/articles/related/:slug", async (req, res) => {
    try {
      const articles = await storage.getArticles();
      const filtered = articles.filter(a => a.slug !== req.params.slug).slice(0, 6);
      res.json(filtered);
    } catch (error) {
      console.error("Error fetching related articles:", error);
      res.status(500).json({ error: "Failed to fetch related articles" });
    }
  });

  app.get("/api/articles/:slug", async (req, res) => {
    try {
      const article = await storage.getArticleBySlug(req.params.slug);
      if (!article) {
        return res.status(404).json({ error: "Article not found" });
      }
      await storage.incrementArticleViews(article.id);
      res.json(article);
    } catch (error) {
      console.error("Error fetching article:", error);
      res.status(500).json({ error: "Failed to fetch article" });
    }
  });

  // ========== MATCHES ==========
  app.get("/api/matches", async (req, res) => {
    try {
      const matches = await storage.getMatches();
      res.json(matches);
    } catch (error) {
      console.error("Error fetching matches:", error);
      res.status(500).json({ error: "Failed to fetch matches" });
    }
  });

  app.get("/api/matches/upcoming", async (req, res) => {
    try {
      const matches = await storage.getMatches();
      const upcoming = matches.filter(m => new Date(m.kickoffTime) > new Date());
      res.json(upcoming);
    } catch (error) {
      console.error("Error fetching upcoming matches:", error);
      res.status(500).json({ error: "Failed to fetch upcoming matches" });
    }
  });

  app.get("/api/matches/team/:slug", async (req, res) => {
    try {
      const matches = await storage.getMatchesByTeam(req.params.slug);
      res.json(matches);
    } catch (error) {
      console.error("Error fetching matches:", error);
      res.status(500).json({ error: "Failed to fetch matches" });
    }
  });

  app.get("/api/matches/:slug", async (req, res) => {
    try {
      const match = await storage.getMatchBySlug(req.params.slug);
      if (!match) {
        return res.status(404).json({ error: "Match not found" });
      }
      res.json(match);
    } catch (error) {
      console.error("Error fetching match:", error);
      res.status(500).json({ error: "Failed to fetch match" });
    }
  });

  // ========== TRANSFERS ==========
  app.get("/api/transfers", async (req, res) => {
    try {
      const transfers = await storage.getTransfers();
      res.json(transfers);
    } catch (error) {
      console.error("Error fetching transfers:", error);
      res.status(500).json({ error: "Failed to fetch transfers" });
    }
  });

  app.get("/api/transfers/latest", async (req, res) => {
    try {
      const transfers = await storage.getTransfers();
      res.json(transfers.slice(0, 10));
    } catch (error) {
      console.error("Error fetching transfers:", error);
      res.status(500).json({ error: "Failed to fetch transfers" });
    }
  });

  app.get("/api/transfers/team/:slug", async (req, res) => {
    try {
      const transfers = await storage.getTransfersByTeam(req.params.slug);
      res.json(transfers);
    } catch (error) {
      console.error("Error fetching transfers:", error);
      res.status(500).json({ error: "Failed to fetch transfers" });
    }
  });

  // ========== INJURIES ==========
  app.get("/api/injuries", async (req, res) => {
    try {
      const injuries = await storage.getInjuries();
      res.json(injuries);
    } catch (error) {
      console.error("Error fetching injuries:", error);
      res.status(500).json({ error: "Failed to fetch injuries" });
    }
  });

  app.get("/api/injuries/team/:slug", async (req, res) => {
    try {
      const injuries = await storage.getInjuriesByTeam(req.params.slug);
      res.json(injuries);
    } catch (error) {
      console.error("Error fetching injuries:", error);
      res.status(500).json({ error: "Failed to fetch injuries" });
    }
  });

  // ========== FOLLOWS ==========
  app.get("/api/follows", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const teamIds = await storage.getFollowsByUser(userId);
      res.json(teamIds);
    } catch (error) {
      console.error("Error fetching follows:", error);
      res.status(500).json({ error: "Failed to fetch follows" });
    }
  });

  app.get("/api/follows/teams", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const teams = await storage.getFollowedTeams(userId);
      res.json(teams);
    } catch (error) {
      console.error("Error fetching followed teams:", error);
      res.status(500).json({ error: "Failed to fetch followed teams" });
    }
  });

  app.post("/api/follows", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { teamId } = req.body;
      if (!teamId) {
        return res.status(400).json({ error: "teamId is required" });
      }
      const follow = await storage.followTeam(userId, teamId);
      res.json(follow);
    } catch (error) {
      console.error("Error following team:", error);
      res.status(500).json({ error: "Failed to follow team" });
    }
  });

  app.delete("/api/follows/:teamId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      await storage.unfollowTeam(userId, req.params.teamId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error unfollowing team:", error);
      res.status(500).json({ error: "Failed to unfollow team" });
    }
  });

  // ========== POSTS ==========
  app.get("/api/posts", async (req, res) => {
    try {
      const posts = await storage.getPosts();
      res.json(posts);
    } catch (error) {
      console.error("Error fetching posts:", error);
      res.status(500).json({ error: "Failed to fetch posts" });
    }
  });

  app.get("/api/posts/team/:slug", async (req, res) => {
    try {
      const posts = await storage.getPostsByTeam(req.params.slug);
      res.json(posts);
    } catch (error) {
      console.error("Error fetching posts:", error);
      res.status(500).json({ error: "Failed to fetch posts" });
    }
  });

  app.post("/api/posts", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const { content, teamId, imageUrl } = req.body;
      if (!content) {
        return res.status(400).json({ error: "content is required" });
      }
      const post = await storage.createPost({
        userId: user.id,
        userName: `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Anonymous",
        userImage: user.profileImageUrl,
        content,
        teamId: teamId || null,
        imageUrl: imageUrl || null,
      });
      res.json(post);
    } catch (error) {
      console.error("Error creating post:", error);
      res.status(500).json({ error: "Failed to create post" });
    }
  });

  app.post("/api/posts/:id/like", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      await storage.likePost(req.params.id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error liking post:", error);
      res.status(500).json({ error: "Failed to like post" });
    }
  });

  // ========== COMMENTS ==========
  app.get("/api/comments/post/:postId", async (req, res) => {
    try {
      const comments = await storage.getCommentsByPost(req.params.postId);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  app.post("/api/comments", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const { content, postId, articleId, matchId } = req.body;
      if (!content) {
        return res.status(400).json({ error: "content is required" });
      }
      const comment = await storage.createComment({
        userId: user.id,
        userName: `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Anonymous",
        userImage: user.profileImageUrl,
        content,
        postId: postId || null,
        articleId: articleId || null,
        matchId: matchId || null,
      });
      res.json(comment);
    } catch (error) {
      console.error("Error creating comment:", error);
      res.status(500).json({ error: "Failed to create comment" });
    }
  });

  // ========== PRODUCTS ==========
  app.get("/api/products", async (req, res) => {
    try {
      const products = await storage.getProducts();
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  app.get("/api/products/:slug", async (req, res) => {
    try {
      const product = await storage.getProductBySlug(req.params.slug);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ error: "Failed to fetch product" });
    }
  });

  // ========== ORDERS ==========
  app.get("/api/orders", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const orders = await storage.getOrdersByUser(userId);
      res.json(orders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  app.post("/api/orders", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const { items, subtotal, total, shippingAddress } = req.body;
      const order = await storage.createOrder({
        userId: user.id,
        userEmail: user.email,
        items,
        subtotal,
        total,
        shippingAddress,
        status: "pending",
      });
      res.json(order);
    } catch (error) {
      console.error("Error creating order:", error);
      res.status(500).json({ error: "Failed to create order" });
    }
  });

  // ========== SUBSCRIBERS ==========
  app.post("/api/subscribers", async (req, res) => {
    try {
      const { email, firstName, tags } = req.body;
      if (!email) {
        return res.status(400).json({ error: "email is required" });
      }
      const subscriber = await storage.createSubscriber({
        email,
        firstName: firstName || null,
        tags: tags || [],
      });
      res.json(subscriber);
    } catch (error) {
      console.error("Error creating subscriber:", error);
      res.status(500).json({ error: "Failed to subscribe" });
    }
  });

  // ========== SHARE ANALYTICS ==========
  app.post("/api/share-click", async (req: any, res) => {
    try {
      const result = shareClickSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: "Invalid request", details: result.error.flatten() });
      }
      const { articleId, platform } = result.data;
      const userId = req.user?.id;
      const userAgent = req.headers["user-agent"];
      await storage.trackShareClick(articleId, platform, userId, userAgent);
      res.json({ success: true });
    } catch (error) {
      console.error("Error tracking share click:", error);
      res.status(500).json({ error: "Failed to track share" });
    }
  });

  // ========== FPL SYNC (Server Job) ==========
  app.post("/api/jobs/sync-fpl-availability", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const expectedSecret = process.env.FPL_SYNC_SECRET;
      
      if (!expectedSecret) {
        console.warn("FPL_SYNC_SECRET not configured");
        return res.status(500).json({ error: "Sync not configured" });
      }
      
      if (!authHeader || authHeader !== `Bearer ${expectedSecret}`) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      console.log("[FPL Sync] Starting sync...");
      const result = await syncFplAvailability();
      console.log(`[FPL Sync] Complete: ${result.updated} updated, ${result.skipped} skipped`);
      
      if (result.errors.length > 0) {
        console.warn("[FPL Sync] Errors:", result.errors.slice(0, 5));
      }
      
      res.json({ ok: true, ...result });
    } catch (error) {
      console.error("[FPL Sync] Error:", error);
      res.status(500).json({ error: "Sync failed" });
    }
  });

  // ========== FPL AVAILABILITY (Team Hub Injuries) ==========
  app.get("/api/teams/:teamSlug/availability", async (req, res) => {
    try {
      const { teamSlug } = req.params;
      const sortBy = req.query.sort === "lowest" ? "lowest" : "recent";
      
      const availability = await storage.getFplAvailabilityByTeam(teamSlug, sortBy);
      
      const enriched = availability.map((player) => {
        const result = classifyPlayer(player.chanceNextRound, player.chanceThisRound, player.fplStatus, player.news);
        return {
          ...player,
          classification: result.classification,
          bucket: result.bucket,
          ringColor: result.ringColor,
          displayPercent: result.displayPercent,
          effectiveChance: result.effectiveChance,
        };
      });
      
      res.json(enriched);
    } catch (error) {
      console.error("Error fetching availability:", error);
      res.status(500).json({ error: "Failed to fetch availability" });
    }
  });
}
